const express = require('express');
const router = express.Router();
const Detection = require('../models/Detection');

// GET /api/detections - Retrieve simulated vehicle observations
router.get('/', async (req, res, next) => {
  try {
    const { cameraId, vehicleType, plateNumber, limit = 50 } = req.query;
    const filter = {};

    if (cameraId) {
      filter.cameraId = cameraId.toUpperCase();
    }

    if (vehicleType) {
      filter.vehicleType = vehicleType.toUpperCase();
    }

    if (plateNumber) {
      filter.plateNumber = { $regex: plateNumber.trim(), $options: 'i' };
    }

    const detections = await Detection.find(filter)
      .sort({ timestamp: -1 })
      .limit(Number(limit));

    res.json({
      success: true,
      count: detections.length,
      data: detections
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/detections/vehicle/:plateNumber - Retrieve chronological sightings for a plate
router.get('/vehicle/:plateNumber', async (req, res, next) => {
  try {
    const { plateNumber } = req.params;
    const cleanPlate = plateNumber.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

    const sightings = await Detection.find({
      plateNumber: { $regex: cleanPlate, $options: 'i' }
    }).sort({ timestamp: 1 });

    res.json({
      success: true,
      plateNumber: cleanPlate,
      totalSightings: sightings.length,
      data: sightings
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/detections/:id - Retrieve single observation by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ID',
        message: `'${id}' is not a valid MongoDB ObjectId`
      });
    }

    const detection = await Detection.findById(id);

    if (!detection) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: `Detection with ID '${id}' not found`
      });
    }

    res.json({
      success: true,
      data: detection
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/detections - Create new simulated observation
router.post('/', async (req, res, next) => {
  try {
    const newDetection = new Detection(req.body);
    const savedDetection = await newDetection.save();

    res.status(201).json({
      success: true,
      message: 'Observation logged successfully',
      data: savedDetection
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: error.message
      });
    }
    next(error);
  }
});

module.exports = router;

