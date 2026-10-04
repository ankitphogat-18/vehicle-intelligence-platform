// backend/routes/vehicleRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Vehicle = require('../models/Vehicle');
const VehicleSighting = require('../models/VehicleSighting');
const { authenticate, requireRole } = require('../middleware/authMiddleware');
const vehicleSearchService = require('../services/vehicleSearchService');
const trajectoryService = require('../services/trajectoryService');
const anomalyService = require('../services/anomalyService');

// Ensure uploads/rc_documents directory exists
const rcUploadsDir = path.join(__dirname, '..', 'uploads', 'rc_documents');
if (!fs.existsSync(rcUploadsDir)) {
  fs.mkdirSync(rcUploadsDir, { recursive: true });
}

// Multer storage setup for RC documents
const rcStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, rcUploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '.pdf';
    cb(null, 'rc-' + uniqueSuffix + ext);
  }
});

const rcUpload = multer({
  storage: rcStorage,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB max
});

/**
 * POST /api/vehicles/register
 * Register a new vehicle for verification (Citizen only)
 * Accepts multipart/form-data with file field 'rcDocument' or JSON
 */
router.post(
  '/register',
  authenticate,
  requireRole(['CITIZEN']),
  rcUpload.single('rcDocument'),
  async (req, res, next) => {
    try {
      const { plateNumber, makeModel, color } = req.body;
      let rcDocPath = req.body.rcDocPath || '';

      if (!plateNumber || !makeModel) {
        return res.status(400).json({
          success: false,
          error: 'ValidationError',
          message: 'Plate number and Make/Model are required'
        });
      }

      const normalizedPlate = plateNumber.trim().toUpperCase().replace(/\s+/g, '');

      const existingVehicle = await Vehicle.findOne({ plateNumber: normalizedPlate });
      if (existingVehicle) {
        return res.status(400).json({
          success: false,
          error: 'DuplicatePlate',
          message: `Vehicle with plate '${normalizedPlate}' is already registered in the system`
        });
      }

      let rcDocumentUrl = '';
      if (req.file) {
        rcDocumentUrl = `/uploads/rc_documents/${req.file.filename}`;
        rcDocPath = rcDocumentUrl;
      } else if (rcDocPath) {
        rcDocumentUrl = rcDocPath.trim();
      }

      const newVehicle = new Vehicle({
        ownerId: req.user.id,
        plateNumber: normalizedPlate,
        makeModel: makeModel.trim(),
        color: color ? color.trim() : '',
        rcDocPath: rcDocPath.trim(),
        rcDocumentUrl: rcDocumentUrl.trim(),
        verificationStatus: 'PENDING',
        policeCaseStatus: 'VERIFICATION_UNDER_REVIEW',
        policeNotes: 'Documents submitted for verification.',
        statusTimeline: [
          {
            status: 'PENDING',
            message: 'Vehicle RC documents submitted for verification.',
            updatedAt: new Date()
          }
        ],
        isVerified: false,
        isStolen: false
      });

      const savedVehicle = await newVehicle.save();

      res.status(201).json({
        success: true,
        message: 'Vehicle registered successfully and submitted for police review',
        data: savedVehicle
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/vehicles/:id/status
 * Update vehicle verification & police case status (Police only)
 */
router.patch(
  '/:id/status',
  authenticate,
  requireRole(['POLICE']),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { verificationStatus, policeCaseStatus, policeNotes, timelineMessage } = req.body;

      const vehicle = await Vehicle.findById(id);
      if (!vehicle) {
        return res.status(404).json({
          success: false,
          error: 'NotFound',
          message: 'Vehicle not found'
        });
      }

      if (verificationStatus) {
        if (!['PENDING', 'APPROVED', 'REJECTED'].includes(verificationStatus)) {
          return res.status(400).json({
            success: false,
            error: 'ValidationError',
            message: "verificationStatus must be 'PENDING', 'APPROVED', or 'REJECTED'"
          });
        }
        vehicle.verificationStatus = verificationStatus;
        vehicle.isVerified = verificationStatus === 'APPROVED';
      }

      if (policeCaseStatus) {
        vehicle.policeCaseStatus = policeCaseStatus;
        if (policeCaseStatus === 'VEHICLE_FOUND') {
          vehicle.isStolen = false;
        } else if (['SEARCH_IN_PROGRESS', 'PATROL_ALERTED'].includes(policeCaseStatus)) {
          vehicle.isStolen = true;
        }
      }

      if (policeNotes !== undefined) {
        vehicle.policeNotes = policeNotes;
      }

      const statusLabel = verificationStatus || policeCaseStatus || vehicle.verificationStatus;
      const messageText = timelineMessage || policeNotes || `Status updated to ${statusLabel} by Cyber Cell`;

      vehicle.statusTimeline.push({
        status: statusLabel,
        message: messageText,
        updatedAt: new Date()
      });

      const updatedVehicle = await vehicle.save();

      res.json({
        success: true,
        message: 'Vehicle status and case timeline updated successfully',
        data: updatedVehicle
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/vehicles/my-vehicles
 * Get all vehicles owned by the logged-in citizen
 */
router.get('/my-vehicles', authenticate, requireRole(['CITIZEN']), async (req, res, next) => {
  try {
    const vehicles = await Vehicle.find({ ownerId: req.user.id }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: vehicles.length,
      data: vehicles
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/vehicles/:plate - full vehicle info (sightings, trajectory, anomalies)
router.get('/:plate', async (req, res, next) => {
  try {
    const plate = req.params.plate?.trim().toUpperCase();
    if (!plate) return res.status(400).json({ success: false, error: 'Plate missing' });
    const sightings = await vehicleSearchService.searchByPlate(plate);
    const trajectory = await trajectoryService.buildTrajectory(sightings);
    const anomalies = await anomalyService.runAllDetectors(sightings);
    res.json({ success: true, data: { plate, sightings, trajectory, anomalies } });
  } catch (err) {
    next(err);
  }
});

// GET /api/vehicles/:plate/trajectory
router.get('/:plate/trajectory', async (req, res, next) => {
  try {
    const plate = req.params.plate?.trim().toUpperCase();
    const sightings = await vehicleSearchService.searchByPlate(plate);
    const trajectory = await trajectoryService.buildTrajectory(sightings);
    res.json({ success: true, data: trajectory });
  } catch (err) {
    next(err);
  }
});

// GET /api/vehicles/:plate/anomalies
router.get('/:plate/anomalies', async (req, res, next) => {
  try {
    const plate = req.params.plate?.trim().toUpperCase();
    const sightings = await vehicleSearchService.searchByPlate(plate);
    const anomalies = await anomalyService.runAllDetectors(sightings);
    res.json({ success: true, data: anomalies });
  } catch (err) {
    next(err);
  }
});

router.get('/:plate/matches', async (req, res, next) => {
  try {
    const plate = req.params.plate?.trim().toUpperCase();
    if (!plate) return res.status(400).json({ success: false, error: 'Plate missing' });
    const sightings = await vehicleSearchService.searchByPlate(plate);
    const reid = require('../services/reidentificationService');
    const allMatches = [];
    for (const s of sightings) {
      const matches = await reid.findPotentialMatches(s);
      matches.forEach(m => {
        allMatches.push({
          type: 'PotentialMatch',
          description: 'Attributes match despite missing/changed plate',
          confidence: m.confidence,
          requiresHumanVerification: m.requiresHumanVerification,
          relatedSightingId: m.sightingId,
        });
      });
    }
    res.json({ success: true, data: allMatches });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
