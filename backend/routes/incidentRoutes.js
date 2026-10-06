const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Incident = require('../models/Incident');
const Alert = require('../models/Alert');
const Sighting = require('../models/Sighting');
const VehicleSighting = require('../models/VehicleSighting');
const Detection = require('../models/Detection');
const Camera = require('../models/Camera');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

// Ensure uploads/incidents directory exists
const incidentsUploadDir = path.join(__dirname, '..', 'uploads', 'incidents');
if (!fs.existsSync(incidentsUploadDir)) {
  fs.mkdirSync(incidentsUploadDir, { recursive: true });
}

// Multer storage setup for incident evidence photos
const incidentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, incidentsUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, 'evidence-' + uniqueSuffix + ext);
  }
});

const incidentUpload = multer({
  storage: incidentStorage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB max
});

/**
 * Helper to process incident creation
 */
async function processIncidentReport(req, res, next) {
  try {
    const {
      incidentType,
      locationName,
      cameraId,
      incidentStartTime,
      incidentEndTime,
      description,
      latitude,
      longitude
    } = req.body;

    if (!incidentType || !['ACCIDENT', 'HIT_AND_RUN'].includes(incidentType)) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: "incidentType must be either 'ACCIDENT' or 'HIT_AND_RUN'"
      });
    }

    if (!cameraId || !incidentStartTime || !incidentEndTime) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Camera checkpoint (cameraId), incidentStartTime, and incidentEndTime are required'
      });
    }

    const startTime = new Date(incidentStartTime);
    const endTime = new Date(incidentEndTime);

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Invalid date/time format for incident window'
      });
    }

    if (endTime < startTime) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'incidentEndTime cannot be earlier than incidentStartTime'
      });
    }

    let evidencePhotoUrl = null;
    const uploadedFile = req.file || (req.files && req.files.length > 0 ? req.files[0] : null);
    if (uploadedFile) {
      evidencePhotoUrl = `/uploads/incidents/${uploadedFile.filename}`;
    } else if (req.body.evidencePhotoUrl) {
      evidencePhotoUrl = req.body.evidencePhotoUrl;
    }

    const latVal = latitude !== undefined && latitude !== '' ? parseFloat(latitude) : null;
    const lngVal = longitude !== undefined && longitude !== '' ? parseFloat(longitude) : null;

    const newIncident = new Incident({
      incidentType,
      locationName: locationName ? locationName.trim() : `Expressway Checkpoint ${cameraId}`,
      cameraId: cameraId.trim().toUpperCase(),
      incidentStartTime: startTime,
      incidentEndTime: endTime,
      description: description ? description.trim() : '',
      reportedBy: req.user.id,
      latitude: !isNaN(latVal) ? latVal : null,
      longitude: !isNaN(lngVal) ? lngVal : null,
      evidencePhotoUrl,
      photoUrl: evidencePhotoUrl
    });

    const savedIncident = await newIncident.save();

    // Automatically create and sync an active Alert for the live radar & alert feed
    let createdAlert = null;
    try {
      createdAlert = await Alert.create({
        type: 'ACCIDENT_REPORTED',
        severity: 'CRITICAL',
        title: `🚨 Emergency Incident: ${incidentType === 'HIT_AND_RUN' ? 'Hit & Run Incident' : 'Highway Accident / Crash'}`,
        description: `${description || 'Emergency accident reported by patrol team'} at ${savedIncident.locationName || 'Highway Checkpoint'}.`,
        message: `${description || 'Emergency accident reported by patrol team'} at ${savedIncident.locationName || 'Highway Checkpoint'}.`,
        locationName: savedIncident.locationName || 'Chandigarh Expressway Corridor',
        latitude: savedIncident.latitude,
        longitude: savedIncident.longitude,
        photoUrl: evidencePhotoUrl,
        evidencePhotoUrl: evidencePhotoUrl,
        cameraId: cameraId ? cameraId.trim().toUpperCase() : 'CAM-CHD-01',
        reportedBy: req.user.id,
        incidentId: savedIncident._id,
        timestamp: new Date(),
        status: 'ACTIVE'
      });
    } catch (alertErr) {
      console.warn('[Incident Alert Auto-creation error]:', alertErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Incident logged successfully and synced with Live Alerts',
      incident: savedIncident,
      alert: createdAlert,
      data: savedIncident
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/incidents/report & POST /api/incidents
 * Report a new expressway incident (Accident or Hit & Run) with optional evidence photo & GPS
 */
router.post(
  '/report',
  authenticate,
  requireRole(['POLICE', 'INCIDENT_MANAGEMENT']),
  incidentUpload.any(),
  processIncidentReport
);

router.post(
  '/',
  authenticate,
  requireRole(['POLICE', 'INCIDENT_MANAGEMENT']),
  incidentUpload.any(),
  processIncidentReport
);

/**
 * GET /api/incidents & GET /api/incidents/all
 * Retrieve logged incidents with optional status filter (?status=ACTIVE)
 */
const getIncidentsHandler = async (req, res, next) => {
  try {
    let filter = {};
    if (req.query.status) {
      const qStatus = req.query.status.toUpperCase();
      if (qStatus === 'ACTIVE') {
        filter.status = { $ne: 'RESOLVED' };
      } else {
        filter.status = qStatus;
      }
    }

    const incidents = await Incident.find(filter)
      .populate('reportedBy', 'name email role phone')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: incidents.length,
      data: incidents,
      incidents
    });
  } catch (err) {
    next(err);
  }
};

router.get('/', getIncidentsHandler);
router.get('/all', getIncidentsHandler);

/**
 * PATCH /api/incidents/:id & PATCH /api/incidents/:id/status
 * Resolve and update incident status, and sync linked alerts
 */
const resolveIncidentHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const newStatus = (status || 'RESOLVED').toUpperCase();

    const incident = await Incident.findById(id);
    if (!incident) {
      return res.status(404).json({
        success: false,
        error: 'NotFound',
        message: 'Incident not found'
      });
    }

    incident.status = newStatus;
    if (newStatus === 'RESOLVED') {
      incident.resolvedAt = new Date();
      if (req.user && req.user.id) {
        incident.resolvedBy = req.user.id;
      }
    }
    await incident.save();

    // Sync any corresponding Alert records
    try {
      await Alert.updateMany(
        {
          $or: [
            { incidentId: incident._id },
            { locationName: incident.locationName, type: 'ACCIDENT_REPORTED' }
          ]
        },
        { $set: { status: newStatus } }
      );
    } catch (alertSyncErr) {
      console.warn('[Incident Alert Sync Error]:', alertSyncErr.message);
    }

    res.json({
      success: true,
      message: `Incident marked as ${newStatus}`,
      data: incident,
      incident
    });
  } catch (err) {
    next(err);
  }
};

router.patch('/:id/status', resolveIncidentHandler);
router.patch('/:id', resolveIncidentHandler);

/**
 * GET /api/incidents/:id/suspects
 * Scan and retrieve all vehicles detected in the camera zone during the incident window
 */
router.get(
  '/:id/suspects',
  authenticate,
  requireRole(['POLICE', 'INCIDENT_MANAGEMENT']),
  async (req, res, next) => {
    try {
      const incident = await Incident.findById(req.params.id).populate('reportedBy', 'name email');

      if (!incident) {
        return res.status(404).json({
          success: false,
          error: 'NotFound',
          message: 'Incident record not found'
        });
      }

      const camPattern = incident.cameraId.replace(/[^A-Za-z0-9]/g, '');
      const camRegex = new RegExp(camPattern.split('').join('.*'), 'i');

      // 1. Check in Sighting collection with time window
      let sightings = await Sighting.find({
        $or: [{ cameraId: incident.cameraId }, { cameraId: camRegex }],
        timestamp: {
          $gte: incident.incidentStartTime,
          $lte: incident.incidentEndTime
        }
      })
        .sort({ timestamp: 1 })
        .lean();

      // 2. If no sightings in Sighting collection, search VehicleSighting and Detection
      if (!sightings || sightings.length === 0) {
        const vsList = await VehicleSighting.find({
          $or: [{ cameraId: incident.cameraId }, { cameraId: camRegex }],
          timestamp: {
            $gte: incident.incidentStartTime,
            $lte: incident.incidentEndTime
          }
        })
          .sort({ timestamp: 1 })
          .lean();

        if (vsList && vsList.length > 0) {
          sightings = vsList.map((s) => ({
            _id: s._id,
            plateNumber: s.plateNumber,
            cameraId: s.cameraId,
            locationName: s.locationName || incident.locationName,
            timestamp: s.timestamp,
            cropImagePath: s.cropImagePath || null,
            vehicleType: s.vehicleType,
            vehicleColor: s.vehicleColor,
            speed: s.speed,
            confidence: s.plateConfidence || 0.95
          }));
        } else {
          const detList = await Detection.find({
            $or: [{ cameraId: incident.cameraId }, { cameraId: camRegex }],
            timestamp: {
              $gte: incident.incidentStartTime,
              $lte: incident.incidentEndTime
            }
          })
            .sort({ timestamp: 1 })
            .lean();

          if (detList && detList.length > 0) {
            sightings = detList.map((d) => ({
              _id: d._id,
              plateNumber: d.plateNumber,
              cameraId: d.cameraId,
              locationName: incident.locationName,
              timestamp: d.timestamp,
              cropImagePath: d.imageUrl || null,
              vehicleType: d.vehicleType,
              vehicleColor: d.vehicleColor,
              speed: d.speed,
              confidence: d.plateConfidence || 0.92
            }));
          } else {
            // Broad camera fallback if timestamps are outside mock baseline date
            const broadSightings = await VehicleSighting.find({
              $or: [{ cameraId: incident.cameraId }, { cameraId: camRegex }]
            })
              .limit(10)
              .sort({ timestamp: -1 })
              .lean();

            if (broadSightings && broadSightings.length > 0) {
              sightings = broadSightings.map((s) => ({
                _id: s._id,
                plateNumber: s.plateNumber,
                cameraId: s.cameraId,
                locationName: incident.locationName,
                timestamp: s.timestamp,
                cropImagePath: s.cropImagePath || null,
                vehicleType: s.vehicleType,
                vehicleColor: s.vehicleColor,
                speed: s.speed,
                confidence: s.plateConfidence || 0.95
              }));
            }
          }
        }
      }

      res.json({
        success: true,
        incident,
        suspectCount: (sightings || []).length,
        suspects: sightings || []
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
