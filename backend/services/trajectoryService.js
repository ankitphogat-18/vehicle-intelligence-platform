// backend/services/trajectoryService.js
const VehicleSighting = require('../models/VehicleSighting');
const Camera = require('../models/Camera');

/**
 * Compute haversine distance between two geo points (km)
 */
function haversine(lat1, lon1, lat2, lon2) {
  const toRad = deg => (deg * Math.PI) / 180;
  const R = 6371; // Earth radius km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Build trajectory information for a set of sightings (already sorted by timestamp).
 * Returns an array where each element contains:
 *   - cameraId, cameraName (from Camera model), location, direction
 *   - timestamp
 *   - travelTimeFromPrev (seconds, null for first)
 */
async function buildTrajectory(sightings) {
  const enriched = [];
  for (let i = 0; i < sightings.length; i++) {
    const s = sightings[i];
    const cam = await Camera.findOne({ cameraId: s.cameraId }).lean();
    const prev = i > 0 ? sightings[i - 1] : null;
    let travelTime = null;
    if (prev) {
      travelTime = (new Date(s.timestamp) - new Date(prev.timestamp)) / 1000; // seconds
    }
    enriched.push({
      sightingId: s._id,
      cameraId: s.cameraId,
      cameraName: cam ? cam.name : null,
      location: cam ? { latitude: cam.latitude, longitude: cam.longitude } : null,
      direction: s.direction,
      timestamp: s.timestamp,
      travelTimeFromPrev: travelTime,
    });
  }
  return enriched;
}

module.exports = { buildTrajectory, haversine };

