const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert');
const Vehicle = require('../models/Vehicle');
const Sighting = require('../models/Sighting');
const VehicleSighting = require('../models/VehicleSighting');
const Detection = require('../models/Detection');
const Anomaly = require('../models/Anomaly');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

/**
 * POST /api/alerts/stolen
 * Report vehicle as stolen (Citizen only)
 */
router.post(
  '/stolen',
  authenticate,
  requireRole(['CITIZEN']),
  async (req, res, next) => {
    try {
      const { vehicleId } = req.body;

      if (!vehicleId) {
        return res.status(400).json({
          success: false,
          error: 'ValidationError',
          message: 'vehicleId is required'
        });
      }

      const vehicle = await Vehicle.findById(vehicleId);
      if (!vehicle) {
        return res.status(404).json({
          success: false,
          error: 'NotFound',
          message: 'Vehicle not found'
        });
      }

      if (vehicle.ownerId.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'You can only report stolen alerts for vehicles you own'
        });
      }

      if (!vehicle.isVerified) {
        return res.status(400).json({
          success: false,
          error: 'UnverifiedVehicle',
          message: 'Vehicle must be verified by police first.'
        });
      }

      // Mark vehicle as stolen
      vehicle.isStolen = true;
      await vehicle.save();

      // Create new active stolen alert
      const alert = new Alert({
        type: 'STOLEN_VEHICLE',
        plateNumber: vehicle.plateNumber,
        vehicleDetails: {
          makeModel: vehicle.makeModel,
          color: vehicle.color || 'Unknown'
        },
        reportedBy: req.user.id,
        status: 'ACTIVE'
      });

      await alert.save();

      // Create or update corresponding Anomaly record so police anomaly overview tracks it
      await Anomaly.updateOne(
        { description: new RegExp(vehicle.plateNumber, 'i') },
        {
          $set: {
            type: 'StolenVehicle',
            description: `Vehicle ${vehicle.plateNumber} reported STOLEN by owner (${vehicle.makeModel})`,
            confidence: 1.0,
            status: 'Potential'
          }
        },
        { upsert: true }
      );

      res.status(201).json({
        success: true,
        message: 'Stolen vehicle alert broadcasted to Police',
        alert
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/alerts/active
 * Retrieve active stolen vehicle alerts (Police only)
 */
router.get(
  '/active',
  authenticate,
  requireRole(['POLICE']),
  async (req, res, next) => {
    try {
      const activeAlerts = await Alert.find({ status: 'ACTIVE' })
        .populate('reportedBy', 'name email')
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        count: activeAlerts.length,
        data: activeAlerts
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/alerts/:plateNumber/trajectory
 * Retrieve camera sightings trajectory for stolen vehicle (Police only)
 */
router.get(
  '/:plateNumber/trajectory',
  authenticate,
  requireRole(['POLICE']),
  async (req, res, next) => {
    try {
      const plateNumber = req.params.plateNumber.toUpperCase().trim();

      // 1. Primary query on Sighting model
      let sightings = await Sighting.find({ plateNumber }).sort({ timestamp: 1 }).lean();

      // 2. If no sightings found in Sighting collection, fallback to VehicleSighting / Detection
      if (!sightings || sightings.length === 0) {
        const vsSightings = await VehicleSighting.find({ plateNumber }).sort({ timestamp: 1 }).lean();
        if (vsSightings && vsSightings.length > 0) {
          sightings = vsSightings.map((s) => ({
            _id: s._id,
            plateNumber: s.plateNumber,
            cameraId: s.cameraId,
            locationName: s.locationName || `Junction / Camera ${s.cameraId}`,
            timestamp: s.timestamp,
            cropImagePath: s.cropImagePath || null,
            confidence: s.plateConfidence || 0.95
          }));
        } else {
          const detSightings = await Detection.find({ plateNumber }).sort({ timestamp: 1 }).lean();
          if (detSightings && detSightings.length > 0) {
            sightings = detSightings.map((d) => ({
              _id: d._id,
              plateNumber: d.plateNumber,
              cameraId: d.cameraId,
              locationName: `Camera Feed ${d.cameraId}`,
              timestamp: d.timestamp,
              cropImagePath: d.imageUrl || null,
              confidence: d.plateConfidence || 0.92
            }));
          }
        }
      }

      res.json({
        success: true,
        plateNumber,
        count: (sightings || []).length,
        trajectory: sightings || []
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/alerts/:id/resolve
 * Resolve a stolen vehicle alert (Police or Citizen owner)
 */
router.patch(
  '/:id/resolve',
  authenticate,
  requireRole(['POLICE', 'CITIZEN']),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const alert = await Alert.findById(id);
      if (!alert) {
        return res.status(404).json({
          success: false,
          error: 'NotFound',
          message: 'Alert not found'
        });
      }

      alert.status = 'RESOLVED';
      await alert.save();

      // Reset isStolen on vehicle
      await Vehicle.findOneAndUpdate(
        { plateNumber: alert.plateNumber },
        { isStolen: false }
      );

      // Dismiss corresponding anomaly
      await Anomaly.updateMany(
        { description: new RegExp(alert.plateNumber, 'i') },
        { status: 'Dismissed' }
      );

      res.json({
        success: true,
        message: 'Alert resolved',
        data: alert
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET all potential alerts (compatibility with legacy Overview & Anomaly endpoints)
router.get('/', async (req, res, next) => {
  try {
    const alerts = await Anomaly.find({ status: 'Potential' }).lean();
    res.json({ success: true, data: alerts });
  } catch (err) {
    next(err);
  }
});

// Update alert status
router.put('/:id', async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ success: false, error: 'Status required' });
    const updated = await Anomaly.findByIdAndUpdate(req.params.id, { status }, { new: true }).lean();
    if (!updated) return res.status(404).json({ success: false, error: 'Alert not found' });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
