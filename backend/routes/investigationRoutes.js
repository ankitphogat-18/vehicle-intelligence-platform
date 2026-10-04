const express = require('express');
const router = express.Router();
const InvestigationCase = require('../models/InvestigationCase');
const Sighting = require('../models/Sighting');
const VehicleSighting = require('../models/VehicleSighting');
const Vehicle = require('../models/Vehicle');
const Camera = require('../models/Camera');
const Alert = require('../models/Alert');

/**
 * GET /api/investigations/corridor-search
 * Corridor & Plate-Swap Search Endpoint
 * Query params: locationName, startTime, endTime, suspectColor, suspectModel, plateNumber
 */
router.get('/corridor-search', async (req, res, next) => {
  try {
    const {
      locationName,
      startTime,
      endTime,
      suspectColor,
      suspectModel,
      plateNumber
    } = req.query;

    // Build time filter (defaults to last 24 hours if not provided)
    const end = endTime ? new Date(endTime) : new Date();
    const start = startTime ? new Date(startTime) : new Date(end.getTime() - 24 * 3600000);

    const timeQuery = { timestamp: { $gte: start, $lte: end } };

    // Fetch cameras for geo and name matching
    const cameras = await Camera.find().lean();
    const cameraMap = new Map(cameras.map((c) => [c.cameraId.toUpperCase(), c]));

    // Find camera IDs matching locationName if specified
    let matchedCameraIds = null;
    if (locationName && locationName.trim()) {
      const locClean = locationName.trim().toLowerCase();
      matchedCameraIds = cameras
        .filter(
          (c) =>
            c.cameraId.toLowerCase().includes(locClean) ||
            (c.name && c.name.toLowerCase().includes(locClean)) ||
            (c.locationName && c.locationName.toLowerCase().includes(locClean)) ||
            (c.sector && c.sector.toLowerCase().includes(locClean))
        )
        .map((c) => c.cameraId.toUpperCase());
    }

    // 1. Query Sightings
    let sightingFilter = { ...timeQuery };
    if (matchedCameraIds && matchedCameraIds.length > 0) {
      sightingFilter.cameraId = { $in: matchedCameraIds };
    } else if (locationName && locationName.trim()) {
      sightingFilter.$or = [
        { locationName: new RegExp(locationName.trim(), 'i') },
        { cameraId: new RegExp(locationName.trim(), 'i') }
      ];
    }

    if (plateNumber && plateNumber.trim()) {
      sightingFilter.plateNumber = new RegExp(plateNumber.trim().toUpperCase(), 'i');
    }

    let rawSightings = await Sighting.find(sightingFilter).sort({ timestamp: -1 }).lean();

    // Also query VehicleSighting for comprehensive coverage
    let vsSightings = await VehicleSighting.find(sightingFilter).sort({ timestamp: -1 }).lean();

    // Merge and deduplicate by plate + cameraId + timestamp (within 30 sec)
    const combined = [...rawSightings];
    const seen = new Set(rawSightings.map((s) => `${s.plateNumber}_${s.cameraId}_${new Date(s.timestamp).getTime()}`));

    for (const vs of vsSightings) {
      const key = `${vs.plateNumber}_${vs.cameraId}_${new Date(vs.timestamp).getTime()}`;
      if (!seen.has(key)) {
        seen.add(key);
        combined.push({
          _id: vs._id,
          plateNumber: vs.plateNumber,
          cameraId: vs.cameraId,
          locationName: vs.locationName || `Checkpoint ${vs.cameraId}`,
          timestamp: vs.timestamp,
          confidence: vs.plateConfidence || 0.95,
          vehicleModel: vs.vehicleModel || vs.vehicleMake || vs.vehicleType || 'SEDAN',
          vehicleColor: vs.vehicleColor || 'White',
          direction: vs.direction || 'INBOUND',
          cropImagePath: null
        });
      }
    }

    // Fetch active stolen alerts
    const activeAlerts = await Alert.find({ status: 'ACTIVE' }).lean();
    const activeStolenPlates = new Set(activeAlerts.map((a) => a.plateNumber.toUpperCase()));

    // 2. Cross-reference Vehicle collection and Detect Plate-Swap / Forgery
    const enrichedSightings = await Promise.all(
      combined.map(async (s) => {
        const plate = s.plateNumber.toUpperCase().trim();
        const cam = cameraMap.get(s.cameraId.toUpperCase());

        // Find registered vehicle
        const vehicle = await Vehicle.findOne({ plateNumber: plate })
          .populate('ownerId', 'name email phone')
          .lean();

        const detectedColor = (s.vehicleColor || s.color || 'White').trim();
        const detectedModel = (s.vehicleModel || s.model || s.vehicleType || 'Sedan').trim();

        let isPlateSwapSuspect = false;
        let isUnregisteredPlate = false;
        const discrepancyReasons = [];

        if (vehicle) {
          const regColor = (vehicle.color || '').trim();
          const regModel = (vehicle.makeModel || '').trim();

          // Compare colors (case-insensitive substring check)
          if (
            regColor &&
            detectedColor &&
            !regColor.toLowerCase().includes(detectedColor.toLowerCase()) &&
            !detectedColor.toLowerCase().includes(regColor.toLowerCase())
          ) {
            isPlateSwapSuspect = true;
            discrepancyReasons.push(
              `Color Mismatch: Plate ${plate} is officially registered as "${regColor}", but Camera detected "${detectedColor}".`
            );
          }

          // Compare models
          if (
            regModel &&
            detectedModel &&
            !regModel.toLowerCase().includes(detectedModel.toLowerCase()) &&
            !detectedModel.toLowerCase().includes(regModel.toLowerCase())
          ) {
            isPlateSwapSuspect = true;
            discrepancyReasons.push(
              `Body / Model Mismatch: Plate ${plate} is registered to "${regModel}", but Camera detected "${detectedModel}".`
            );
          }
        } else {
          // Plate not found in official registry
          isUnregisteredPlate = true;
          // If suspect physical filters were provided and match
          if (
            (suspectColor && detectedColor.toLowerCase().includes(suspectColor.toLowerCase())) ||
            (suspectModel && detectedModel.toLowerCase().includes(suspectModel.toLowerCase()))
          ) {
            isPlateSwapSuspect = true;
            discrepancyReasons.push(
              `Unregistered Plate: Plate ${plate} is not registered in VAHAN records, but vehicle body matches suspect profile (${detectedColor} ${detectedModel}).`
            );
          }
        }

        const isStolen = activeStolenPlates.has(plate) || (vehicle && vehicle.isStolen);
        if (isStolen) {
          discrepancyReasons.push(`Hotlist Alert: Vehicle ${plate} is reported stolen.`);
        }

        const d = new Date(s.timestamp);
        const formattedTime = `${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, ${d.toLocaleDateString()}`;

        return {
          sightingId: s._id,
          plateNumber: plate,
          cameraId: s.cameraId,
          cameraName: cam ? cam.name : s.locationName || s.cameraId,
          locationName: cam ? cam.locationName || cam.name : s.locationName || s.cameraId,
          sector: cam ? cam.sector : 'Chandigarh',
          latitude: cam ? cam.latitude : null,
          longitude: cam ? cam.longitude : null,
          timestamp: s.timestamp,
          formattedTime,
          confidence: s.confidence || 0.95,
          cropImagePath: s.cropImagePath || null,
          detectedColor,
          detectedModel,
          direction: s.direction || 'INBOUND',

          // Registered Details
          isRegistered: !!vehicle,
          registeredModel: vehicle ? vehicle.makeModel : 'Unregistered',
          registeredColor: vehicle ? vehicle.color : 'Unregistered',
          verificationStatus: vehicle ? vehicle.verificationStatus : 'UNREGISTERED',
          rcDocumentUrl: vehicle ? vehicle.rcDocumentUrl : null,
          policeCaseStatus: vehicle ? vehicle.policeCaseStatus : 'NOT_REPORTED',
          owner: vehicle?.ownerId
            ? {
                name: vehicle.ownerId.name,
                email: vehicle.ownerId.email,
                phone: vehicle.ownerId.phone || '+91 98765 43210'
              }
            : null,
          chalaanCount: vehicle?.chalaanHistory ? vehicle.chalaanHistory.length : 0,

          // Fraud & Plate-Swap Flags
          isPlateSwapSuspect,
          isUnregisteredPlate,
          isStolen,
          discrepancyReasons,
          discrepancyNote: discrepancyReasons.join(' | ')
        };
      })
    );

    // Filter into subsets
    const exactMatches = enrichedSightings.filter((s) => {
      if (plateNumber && plateNumber.trim()) {
        return s.plateNumber.includes(plateNumber.trim().toUpperCase());
      }
      return s.isStolen;
    });

    const visualSuspects = enrichedSightings.filter((s) => {
      let matchesFilter = true;
      if (suspectColor && suspectColor.trim()) {
        matchesFilter =
          matchesFilter &&
          s.detectedColor.toLowerCase().includes(suspectColor.trim().toLowerCase());
      }
      if (suspectModel && suspectModel.trim()) {
        matchesFilter =
          matchesFilter &&
          (s.detectedModel.toLowerCase().includes(suspectModel.trim().toLowerCase()) ||
            s.registeredModel.toLowerCase().includes(suspectModel.trim().toLowerCase()));
      }
      return s.isPlateSwapSuspect || (suspectColor || suspectModel ? matchesFilter : false);
    });

    res.json({
      success: true,
      count: enrichedSightings.length,
      filters: {
        locationName: locationName || 'All Checkpoints',
        startTime: start,
        endTime: end,
        suspectColor: suspectColor || null,
        suspectModel: suspectModel || null,
        plateNumber: plateNumber || null
      },
      exactMatches,
      visualSuspects,
      allSightings: enrichedSightings
    });
  } catch (err) {
    next(err);
  }
});

// Create a new investigation case
router.post('/', async (req, res, next) => {
  try {
    const { vehiclePlate, title, notes, evidence, anomalyIds, sightingIds } = req.body;
    const caseDoc = await InvestigationCase.create({
      vehiclePlate: vehiclePlate?.trim().toUpperCase(),
      title,
      notes,
      evidence: evidence || [],
      anomalyIds: anomalyIds || [],
      sightingIds: sightingIds || [],
    });
    res.json({ success: true, data: caseDoc });
  } catch (err) {
    next(err);
  }
});

// Get all investigations (basic list)
router.get('/', async (req, res, next) => {
  try {
    const cases = await InvestigationCase.find().lean();
    res.json({ success: true, data: cases });
  } catch (err) {
    next(err);
  }
});

// Get a specific investigation with populated references
router.get('/:id', async (req, res, next) => {
  try {
    const inv = await InvestigationCase.findById(req.params.id)
      .populate('anomalyIds')
      .populate('sightingIds')
      .lean();
    if (!inv) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: inv });
  } catch (err) {
    next(err);
  }
});

// Update investigation (status, notes, evidence)
router.put('/:id', async (req, res, next) => {
  try {
    const updates = {};
    const allowed = ['status', 'notes', 'evidence'];
    allowed.forEach((f) => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });
    const updated = await InvestigationCase.findByIdAndUpdate(req.params.id, updates, { new: true }).lean();
    if (!updated) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
