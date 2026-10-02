// backend/routes/vehicleRoutes.js
const express = require('express');
const router = express.Router();
const Vehicle = require('../models/Vehicle');
const VehicleSighting = require('../models/VehicleSighting');
const { authenticate, requireRole } = require('../middleware/authMiddleware');
const vehicleSearchService = require('../services/vehicleSearchService');
const trajectoryService = require('../services/trajectoryService');
const anomalyService = require('../services/anomalyService');

/**
 * POST /api/vehicles/register
 * Register a new vehicle for verification (Citizen only)
 */
router.post('/register', authenticate, requireRole(['CITIZEN']), async (req, res, next) => {
  try {
    const { plateNumber, makeModel, color, rcDocPath } = req.body;

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

    const newVehicle = new Vehicle({
      ownerId: req.user.id,
      plateNumber: normalizedPlate,
      makeModel: makeModel.trim(),
      color: color ? color.trim() : '',
      rcDocPath: rcDocPath ? rcDocPath.trim() : '',
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
});

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
