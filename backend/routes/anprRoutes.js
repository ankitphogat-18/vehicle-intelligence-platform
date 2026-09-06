const express = require('express');
const multer = require('multer');
const router = express.Router();
const { recognizePlate } = require('../services/ocrService');
const Detection = require('../models/Detection');
const Camera = require('../models/Camera');

// Configure Multer with MemoryStorage and strict validation
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file format. Only JPEG, PNG, and WebP images are permitted.'), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB maximum
  },
  fileFilter
});

// POST /api/anpr/recognize - Ingest image and return OCR/ANPR result
router.post('/recognize', upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'No image file uploaded. Please supply a valid image in the "image" field.'
      });
    }

    const result = await recognizePlate(req.file.buffer);

    res.json({
      success: true,
      fileInfo: {
        originalName: req.file.originalname,
        sizeBytes: req.file.size,
        mimeType: req.file.mimetype
      },
      ...result
    });
  } catch (error) {
    console.error('[ANPR Route Error]:', error);
    next(error);
  }
});

// POST /api/anpr/log-observation - Save a verified or corrected ANPR observation
router.post('/log-observation', async (req, res, next) => {
  try {
    const {
      cameraId,
      plateNumber,
      plateConfidence,
      vehicleType = 'SEDAN',
      vehicleColor = 'White',
      direction = 'INBOUND',
      speed = null,
      lane = 1,
      manuallyVerified = true
    } = req.body;

    if (!cameraId || !plateNumber) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'cameraId and plateNumber are required fields.'
      });
    }

    // Verify camera exists
    const camera = await Camera.findOne({ cameraId: cameraId.toUpperCase() });
    if (!camera) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: `Camera '${cameraId}' not found in registry.`
      });
    }

    const newDetection = new Detection({
      cameraId: camera.cameraId,
      timestamp: new Date(),
      plateNumber: plateNumber.toUpperCase().trim(),
      plateConfidence: Number(plateConfidence) || 0.95,
      vehicleType,
      vehicleColor,
      direction: direction || camera.direction,
      speed: speed ? Number(speed) : null,
      lane: Number(lane) || 1,
      sourceType: manuallyVerified ? 'MANUAL_TEST' : 'SIMULATED_FEED'
    });

    const saved = await newDetection.save();

    res.status(201).json({
      success: true,
      message: 'ANPR observation verified and recorded successfully',
      data: saved
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/anpr/test-samples - Return metadata for sample test plates
router.get('/test-samples', (req, res) => {
  const samples = [
    {
      id: 'sample-1',
      plate: 'DL01AB1234',
      vehicleType: 'SEDAN',
      vehicleColor: 'White',
      state: 'Delhi',
      description: 'Standard Delhi Private Vehicle Plate'
    },
    {
      id: 'sample-2',
      plate: 'HR26DQ5678',
      vehicleType: 'SUV',
      vehicleColor: 'Black',
      state: 'Haryana (Gurugram)',
      description: 'Haryana Private Commercial/SUV Plate'
    },
    {
      id: 'sample-3',
      plate: 'UP16XY9988',
      vehicleType: 'HATCHBACK',
      vehicleColor: 'Silver',
      state: 'Uttar Pradesh (Noida)',
      description: 'UP Commercial Hub Plate'
    },
    {
      id: 'sample-4',
      plate: 'MH12DE1433',
      vehicleType: 'SEDAN',
      vehicleColor: 'Dark Grey',
      state: 'Maharashtra (Pune)',
      description: 'Maharashtra Inter-state Transport Plate'
    }
  ];

  res.json({
    success: true,
    samples
  });
});

module.exports = router;

