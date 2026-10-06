const express = require('express');
const router = express.Router();
const SecurityZone = require('../models/SecurityZone');
const Camera = require('../models/Camera');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

/**
 * Helper to compute polygon bounding coordinates around a set of camera checkpoints
 */
async function generateZoneCoordinates(cameraIds) {
  const cleanIds = cameraIds.map((id) => id.trim().toUpperCase());
  const cameras = await Camera.find({
    cameraId: { $in: cleanIds }
  }).lean();

  const validCams = cameras.filter((c) => c.latitude && c.longitude);
  if (validCams.length === 0) {
    // Default Chandigarh center bounding polygon
    return [
      [30.7450, 76.7750],
      [30.7450, 76.7950],
      [30.7300, 76.7950],
      [30.7300, 76.7750]
    ];
  }

  const lats = validCams.map((c) => c.latitude);
  const lngs = validCams.map((c) => c.longitude);

  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  // Add buffer padding (~400-500 meters)
  const padding = 0.0055;
  const north = maxLat + padding;
  const south = minLat - padding;
  const east = maxLng + padding;
  const west = minLng - padding;

  return [
    [north, west],
    [north, east],
    [south, east],
    [south, west]
  ];
}

/**
 * GET /api/security-zones
 * Retrieve active or all security zones
 */
router.get('/', async (req, res, next) => {
  try {
    const { status, all } = req.query;
    const filter = {};
    if (all !== 'true' && all !== '1') {
      filter.status = status ? status.toUpperCase() : 'ACTIVE';
    }

    const zones = await SecurityZone.find(filter).sort({ createdAt: -1 }).lean();

    res.json({
      success: true,
      count: zones.length,
      data: zones,
      zones
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/security-zones
 * Declare and activate a new security zone
 */
router.post(
  '/',
  authenticate,
  requireRole(['POLICE', 'ADMIN', 'INCIDENT_MANAGEMENT']),
  async (req, res, next) => {
    try {
      const { name, reason, level, cameraIds, coordinates } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          error: 'ValidationError',
          message: 'Zone name is required'
        });
      }

      const zoneLevel = level === 'LEVEL_1_BUFFER' ? 'LEVEL_1_BUFFER' : 'LEVEL_2_EXCLUSION';
      const cleanCameraIds = Array.isArray(cameraIds)
        ? cameraIds.map((c) => String(c).trim().toUpperCase()).filter(Boolean)
        : [];

      let finalCoordinates = coordinates;
      if (!Array.isArray(finalCoordinates) || finalCoordinates.length < 3) {
        finalCoordinates = await generateZoneCoordinates(cleanCameraIds);
      }

      const newZone = new SecurityZone({
        name: name.trim(),
        reason: reason ? reason.trim() : 'Security Protocol Enforcement',
        level: zoneLevel,
        cameraIds: cleanCameraIds,
        coordinates: finalCoordinates,
        status: 'ACTIVE',
        activatedBy: req.user?.name || req.user?.email || 'Police Command HQ',
        activatedAt: new Date()
      });

      const savedZone = await newZone.save();

      // Escalate camera security levels
      if (cleanCameraIds.length > 0) {
        await Camera.updateMany(
          { cameraId: { $in: cleanCameraIds } },
          {
            $set: {
              currentSecurityLevel: zoneLevel,
              isRestricted: zoneLevel === 'LEVEL_2_EXCLUSION'
            }
          }
        );
      }

      res.status(201).json({
        success: true,
        message: `Security Zone "${savedZone.name}" activated successfully at ${zoneLevel}`,
        zone: savedZone,
        data: savedZone
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/security-zones/:id/deactivate
 * Deactivate an active security zone and restore camera levels
 */
router.patch(
  '/:id/deactivate',
  authenticate,
  requireRole(['POLICE', 'ADMIN', 'INCIDENT_MANAGEMENT']),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const zone = await SecurityZone.findById(id);

      if (!zone) {
        return res.status(404).json({
          success: false,
          error: 'NotFound',
          message: 'Security zone not found'
        });
      }

      zone.status = 'INACTIVE';
      zone.deactivatedAt = new Date();
      await zone.save();

      // Reset camera security levels back to NORMAL (if camera not part of another active zone)
      if (zone.cameraIds && zone.cameraIds.length > 0) {
        const otherActiveZones = await SecurityZone.find({
          _id: { $ne: zone._id },
          status: 'ACTIVE',
          cameraIds: { $in: zone.cameraIds }
        }).lean();

        const activeCameraMap = new Map();
        otherActiveZones.forEach((z) => {
          z.cameraIds.forEach((cId) => {
            // Keep higher level if collision
            if (!activeCameraMap.has(cId) || z.level === 'LEVEL_2_EXCLUSION') {
              activeCameraMap.set(cId, z.level);
            }
          });
        });

        for (const camId of zone.cameraIds) {
          if (activeCameraMap.has(camId)) {
            const remainingLevel = activeCameraMap.get(camId);
            await Camera.updateOne(
              { cameraId: camId },
              {
                $set: {
                  currentSecurityLevel: remainingLevel,
                  isRestricted: remainingLevel === 'LEVEL_2_EXCLUSION'
                }
              }
            );
          } else {
            await Camera.updateOne(
              { cameraId: camId },
              {
                $set: {
                  currentSecurityLevel: 'NORMAL',
                  isRestricted: false
                }
              }
            );
          }
        }
      }

      res.json({
        success: true,
        message: `Security zone "${zone.name}" deactivated. Checkpoints restored to NORMAL status.`,
        data: zone,
        zone
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
