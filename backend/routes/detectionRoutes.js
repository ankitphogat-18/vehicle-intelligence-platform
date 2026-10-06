const express = require('express');
const router = express.Router();
const Detection = require('../models/Detection');
const Sighting = require('../models/Sighting');
const VehicleSighting = require('../models/VehicleSighting');
const Vehicle = require('../models/Vehicle');
const Camera = require('../models/Camera');
const Alert = require('../models/Alert');
const SecurityZone = require('../models/SecurityZone');

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

/**
 * POST /api/detections
 * Live Camera Detection & Alerts Ingestion
 * Accepts: { plate_number, visual_color, visual_model, camera_id, confidence, cropImagePath }
 */
router.post('/', async (req, res, next) => {
  try {
    const {
      plate_number,
      plateNumber,
      visual_color,
      visual_model,
      camera_id,
      cameraId,
      confidence,
      cropImagePath,
      locationName
    } = req.body;

    const rawPlate = (plate_number || plateNumber || '').trim().toUpperCase();
    const camId = (camera_id || cameraId || 'CAM-CHD-01').trim().toUpperCase();
    const visualColor = (visual_color || req.body.vehicleColor || 'White').trim();
    const visualModel = (visual_model || req.body.vehicleModel || req.body.vehicleType || 'Sedan').trim();
    const conf = Number(confidence) || 0.95;
    const lat = parseFloat(req.body.lat || req.body.latitude);
    const lng = parseFloat(req.body.lng || req.body.longitude);

    if (!rawPlate) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'plate_number / plateNumber is required'
      });
    }

    // Dynamic Mobile Camera Upsert
    if (!isNaN(lat) && !isNaN(lng) && (camId.includes('MOBILE') || camId === 'MOBILE_PATROL_LIVE')) {
      try {
        await Camera.findOneAndUpdate(
          { cameraId: 'MOBILE_PATROL_LIVE' },
          {
            cameraId: 'MOBILE_PATROL_LIVE',
            name: '📱 Mobile Field Patrol Unit (Live GPS)',
            locationName: locationName || '📱 Mobile Field Patrol Checkpoint',
            latitude: lat,
            longitude: lng,
            status: 'ONLINE',
            type: 'ANPR',
            sector: 'Field Mobile Patrol',
            junction: 'Dynamic Mobile GPS'
          },
          { upsert: true, new: true }
        );
      } catch (camErr) {
        console.warn('[Camera Upsert Warning]:', camErr.message);
      }
    }

    // 1. Look up Camera
    const camera = await Camera.findOne({ cameraId: camId }).lean();
    const camLocation = camera ? camera.locationName || camera.name : locationName || `Camera ${camId}`;

    // 2. Look up Vehicle in official VAHAN registry
    const vehicle = await Vehicle.findOne({ plateNumber: rawPlate })
      .populate('ownerId', 'name email phone')
      .lean();

    const triggeredAlerts = [];

    // Check Security Zone Enforcement & Level Escalation
    let activeZone = null;
    try {
      activeZone = await SecurityZone.findOne({
        status: 'ACTIVE',
        cameraIds: camId
      }).lean();
    } catch (zErr) {
      console.warn('[SecurityZone lookup warn]:', zErr.message);
    }

    const securityLevel = camera?.currentSecurityLevel || activeZone?.level || (camera?.isRestricted ? 'LEVEL_2_EXCLUSION' : 'NORMAL');
    const zoneName = activeZone?.name || camera?.sector || 'High-Security Perimeter';

    if (securityLevel === 'LEVEL_1_BUFFER') {
      const bufferAlert = new Alert({
        type: 'BUFFER_ZONE_WARNING',
        severity: 'MEDIUM',
        title: `🟡 Warning: Level-1 Buffer Entry (${zoneName})`,
        message: `🟡 Warning: Vehicle ${rawPlate} entered Level-1 Buffer of ${zoneName}. Early naka diversion advised.`,
        description: `🟡 Warning: Vehicle ${rawPlate} entered Level-1 Buffer of ${zoneName}. Early naka diversion advised.`,
        plateNumber: rawPlate,
        locationName: camLocation,
        cameraId: camId,
        latitude: camera?.latitude,
        longitude: camera?.longitude,
        vehicleDetails: {
          makeModel: vehicle ? vehicle.makeModel : visualModel,
          color: vehicle ? vehicle.color : visualColor
        },
        status: 'ACTIVE'
      });
      await bufferAlert.save();
      triggeredAlerts.push(bufferAlert);
    } else if (securityLevel === 'LEVEL_2_EXCLUSION') {
      const breachAlert = new Alert({
        type: 'RESTRICTED_ZONE_BREACH',
        severity: 'CRITICAL',
        title: `🔴 CRITICAL: Zero-Tolerance Breach (${zoneName})`,
        message: `🔴 CRITICAL: Zero-tolerance breach in ${zoneName}! Unauthorized vehicle ${rawPlate} detected at barrier.`,
        description: `🔴 CRITICAL: Zero-tolerance breach in ${zoneName}! Unauthorized vehicle ${rawPlate} detected at barrier.`,
        plateNumber: rawPlate,
        locationName: camLocation,
        cameraId: camId,
        latitude: camera?.latitude,
        longitude: camera?.longitude,
        vehicleDetails: {
          makeModel: vehicle ? vehicle.makeModel : visualModel,
          color: vehicle ? vehicle.color : visualColor
        },
        status: 'ACTIVE'
      });
      await breachAlert.save();
      triggeredAlerts.push(breachAlert);
    }

    // Check Rules 2 & 3 if vehicle exists in VAHAN
    if (vehicle) {
      // Check Stolen status
      if (
        vehicle.policeCaseStatus === 'SEARCH_IN_PROGRESS' ||
        vehicle.isStolen === true ||
        vehicle.status === 'STOLEN'
      ) {
        const stolenAlert = new Alert({
          type: 'STOLEN_VEHICLE_SPOTTED',
          severity: 'HIGH',
          plateNumber: rawPlate,
          description: `Active stolen vehicle ${rawPlate} sighted at checkpoint ${camLocation} (${camId}).`,
          locationName: camLocation,
          cameraId: camId,
          vehicleDetails: {
            makeModel: vehicle.makeModel,
            color: vehicle.color
          },
          status: 'ACTIVE'
        });
        await stolenAlert.save();
        triggeredAlerts.push(stolenAlert);
      }

      // Check Cloned Plate Fraud (Color & Make/Model mismatch)
      const regColor = (vehicle.color || '').trim().toLowerCase();
      const detColor = visualColor.toLowerCase();
      const regModel = (vehicle.makeModel || '').trim().toLowerCase();
      const detModel = visualModel.toLowerCase();

      const colorMismatch = regColor && detColor && !regColor.includes(detColor) && !detColor.includes(regColor);
      const modelMismatch = regModel && detModel && !regModel.includes(detModel) && !detModel.includes(regModel);

      if (colorMismatch || modelMismatch) {
        let discrepancyText = `Cloned registration suspected on plate ${rawPlate}. `;
        if (colorMismatch) {
          discrepancyText += `Registered Color: "${vehicle.color}" vs Detected Color: "${visualColor}". `;
        }
        if (modelMismatch) {
          discrepancyText += `Registered Model: "${vehicle.makeModel}" vs Detected Model: "${visualModel}". `;
        }

        const clonedAlert = new Alert({
          type: 'CLONED_PLATE_FRAUD',
          severity: 'CRITICAL',
          plateNumber: rawPlate,
          description: discrepancyText.trim(),
          locationName: camLocation,
          cameraId: camId,
          vehicleDetails: {
            makeModel: vehicle.makeModel,
            color: vehicle.color
          },
          status: 'ACTIVE'
        });
        await clonedAlert.save();
        triggeredAlerts.push(clonedAlert);
      }
    }

    // 3. Create Sighting document
    const newSighting = new Sighting({
      plateNumber: rawPlate,
      cameraId: camId,
      locationName: camLocation,
      timestamp: new Date(),
      confidence: conf,
      cropImagePath: cropImagePath || null
    });
    await newSighting.save();

    // 4. Synchronize with VehicleSighting & Detection collections
    try {
      await VehicleSighting.create({
        cameraId: camId,
        plateNumber: rawPlate,
        timestamp: new Date(),
        plateConfidence: conf,
        vehicleType: visualModel.includes('SUV') ? 'SUV' : 'SEDAN',
        vehicleMake: visualModel.split(' ')[0] || 'Unknown',
        vehicleModel: visualModel,
        vehicleColor: visualColor,
        direction: 'INBOUND',
        sourceType: 'LIVE_CCTV'
      });

      await Detection.create({
        cameraId: camId,
        plateNumber: rawPlate,
        timestamp: new Date(),
        plateConfidence: conf,
        vehicleType: visualModel.includes('SUV') ? 'SUV' : 'SEDAN',
        vehicleColor: visualColor,
        sourceType: 'LIVE_FEED'
      });
    } catch (e) {}

    res.status(201).json({
      success: true,
      message: 'Camera detection processed and analyzed successfully',
      detection: {
        plate_number: rawPlate,
        visual_color: visualColor,
        visual_model: visualModel,
        camera_id: camId,
        locationName: camLocation,
        confidence: conf,
        timestamp: newSighting.timestamp,
        cropImagePath
      },
      isRegistered: !!vehicle,
      vehicle: vehicle || null,
      alertsTriggered: triggeredAlerts.length > 0,
      alerts: triggeredAlerts
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
