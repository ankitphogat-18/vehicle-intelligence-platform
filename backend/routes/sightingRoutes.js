const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Sighting = require('../models/Sighting');
const VehicleSighting = require('../models/VehicleSighting');
const Alert = require('../models/Alert');
const aiBridge = require('../services/aiBridge');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

// Ensure upload folders exist
const framesDir = path.join(__dirname, '..', 'uploads', 'frames');
const videosDir = path.join(__dirname, '..', 'uploads', 'videos');
const cropsDir = path.join(__dirname, '..', 'uploads', 'crops');

[framesDir, videosDir, cropsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure Multer with DiskStorage for clean file path passing to AI bridge
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, videosDir);
    } else {
      cb(null, framesDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || (file.mimetype.startsWith('video/') ? '.mp4' : '.jpg');
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

/**
 * POST /api/sightings/ingest-frame
 * Custom AI detection on camera frame / mobile scanner + hotlist cross-referencing
 */
router.post(
  '/ingest-frame',
  upload.any(),
  async (req, res, next) => {
    try {
      const cameraId = (req.body.cameraId || 'CAM-001').toUpperCase().trim();
      const locationName = req.body.locationName || 'Expressway Checkpoint';

      let tempFilePath = null;

      const uploadedFile = req.file || (req.files && req.files.length > 0 ? req.files[0] : null);

      if (uploadedFile && uploadedFile.path) {
        tempFilePath = uploadedFile.path;
      } else if (req.body.frameBase64) {
        // Save base64 frame to disk
        const base64Data = req.body.frameBase64.replace(/^data:image\/\w+;base64,/, '');
        tempFilePath = path.join(framesDir, `frame-${Date.now()}.jpg`);
        fs.writeFileSync(tempFilePath, Buffer.from(base64Data, 'base64'));
      }

      if (!tempFilePath) {
        return res.status(400).json({
          success: false,
          error: 'ValidationError',
          message: 'No image frame provided'
        });
      }

      // Call Custom AI Bridge
      const aiResult = await aiBridge.detectPlateFromImage(tempFilePath);

      // Clean up temporary frame file if generated from base64
      if (req.body.frameBase64 && fs.existsSync(tempFilePath)) {
        try { fs.unlinkSync(tempFilePath); } catch (e) {}
      }

      const plateNumber = aiResult.plateNumber
        ? aiResult.plateNumber.toUpperCase().trim()
        : req.body.simulatedPlate
        ? req.body.simulatedPlate.toUpperCase().trim()
        : null;

      if (!plateNumber) {
        return res.json({
          success: true,
          plateNumber: null,
          message: 'No plate detected'
        });
      }

      const confidence = Number(aiResult.confidence) || 0.92;
      const cropImagePath = aiResult.cropImagePath || null;

      // Save to Sighting collection
      const newSighting = new Sighting({
        plateNumber,
        cameraId,
        locationName,
        timestamp: new Date(),
        cropImagePath,
        confidence
      });
      await newSighting.save();

      // Synchronize with VehicleSighting for unified trajectory search
      try {
        await VehicleSighting.create({
          cameraId,
          plateNumber,
          timestamp: new Date(),
          plateConfidence: confidence,
          vehicleType: 'SEDAN',
          vehicleColor: 'White',
          locationName,
          sourceType: cameraId.includes('MOBILE') ? 'MOBILE_LIVE_CAMERA' : 'LIVE_AI_FEED'
        });
      } catch (vsErr) {}

      // Cross-check active stolen hotlist alerts
      const matchedAlert = await Alert.findOne({
        plateNumber,
        status: 'ACTIVE'
      }).populate('reportedBy', 'name email');

      if (matchedAlert) {
        return res.json({
          success: true,
          plateNumber,
          confidence,
          cropImagePath,
          hotlistHit: true,
          alertDetails: matchedAlert,
          sighting: newSighting,
          data: newSighting
        });
      }

      return res.json({
        success: true,
        plateNumber,
        confidence,
        cropImagePath,
        hotlistHit: false,
        sighting: newSighting,
        data: newSighting
      });
    } catch (err) {
      console.error('[Ingest Frame Error]:', err.message);
      return res.status(500).json({
        success: false,
        error: 'IngestionError',
        message: err.message || 'Error ingesting camera frame'
      });
    }
  }
);

/**
 * POST /api/sightings/upload-surveillance-video
 * Runs YOLO tracking and majority voting on surveillance video clip
 */
router.post(
  '/upload-surveillance-video',
  authenticate,
  requireRole(['POLICE']),
  upload.single('video'),
  async (req, res, next) => {
    try {
      const cameraId = (req.body.cameraId || 'CAM-001').toUpperCase().trim();
      const locationName = req.body.locationName || 'Expressway Video Ingestion Checkpoint';

      if (!req.file || !req.file.path) {
        return res.status(400).json({
          success: false,
          error: 'ValidationError',
          message: 'No video file uploaded'
        });
      }

      // Run Custom Video Tracking AI Pipeline
      const detectedVehicles = await aiBridge.detectPlatesFromVideo(req.file.path);

      // Check active alerts
      const activeAlerts = await Alert.find({ status: 'ACTIVE' }).lean();
      const alertPlates = new Set(activeAlerts.map((a) => a.plateNumber));

      const savedSightings = [];
      const baseTime = Date.now();

      for (let i = 0; i < detectedVehicles.length; i++) {
        const item = detectedVehicles[i];
        const plate = item.plateNumber.toUpperCase().trim();
        const sTime = item.timestamp ? new Date(item.timestamp) : new Date(baseTime - (detectedVehicles.length - i) * 30000);

        const sighting = new Sighting({
          plateNumber: plate,
          cameraId,
          locationName,
          timestamp: sTime,
          cropImagePath: item.cropImagePath || null,
          confidence: item.confidence || 0.93
        });
        await sighting.save();

        try {
          await VehicleSighting.create({
            cameraId,
            plateNumber: plate,
            timestamp: sTime,
            plateConfidence: item.confidence || 0.93,
            vehicleType: 'SEDAN',
            vehicleColor: 'Silver',
            locationName,
            sourceType: 'SURVEILLANCE_AI_VIDEO'
          });
        } catch (e) {}

        savedSightings.push({
          ...sighting.toObject(),
          hotlistHit: alertPlates.has(plate)
        });
      }

      res.json({
        success: true,
        message: 'Surveillance video processed successfully with AI pipeline',
        totalVehiclesDetected: savedSightings.length,
        sightings: savedSightings
      });
    } catch (err) {
      console.error('[Video Ingestion Error]:', err.message);
      return res.status(500).json({
        success: false,
        error: 'VideoProcessingError',
        message: err.message || 'Failed to process surveillance video'
      });
    }
  }
);

/**
 * GET /api/sightings/recent
 * Returns the 20 most recent sightings across all cameras
 */
router.get(
  '/recent',
  authenticate,
  requireRole(['POLICE']),
  async (req, res, next) => {
    try {
      const activeAlerts = await Alert.find({ status: 'ACTIVE' }).lean();
      const activePlates = new Set(activeAlerts.map((a) => a.plateNumber));

      let sightings = await Sighting.find().sort({ timestamp: -1 }).limit(20).lean();

      if (!sightings || sightings.length === 0) {
        const vsList = await VehicleSighting.find().sort({ timestamp: -1 }).limit(20).lean();
        sightings = vsList.map((s) => ({
          _id: s._id,
          plateNumber: s.plateNumber,
          cameraId: s.cameraId,
          locationName: s.locationName || `Junction ${s.cameraId}`,
          timestamp: s.timestamp,
          cropImagePath: s.cropImagePath || null,
          confidence: s.plateConfidence || 0.95
        }));
      }

      const enriched = sightings.map((s) => ({
        ...s,
        hotlistHit: activePlates.has(s.plateNumber)
      }));

      res.json({
        success: true,
        count: enriched.length,
        data: enriched
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;

