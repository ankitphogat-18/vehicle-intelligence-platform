// backend/services/anomalyService.js
const VehicleSighting = require('../models/VehicleSighting');
const WatchlistVehicle = require('../models/WatchlistVehicle');
const { haversine } = require('./trajectoryService');

const IMPOSSIBLE_SPEED_KMH = 150; // prototype threshold

/**
 * Detect impossible travel between consecutive sightings.
 * Returns array of anomaly objects.
 */
async function detectImpossibleTravel(sightings) {
  const anomalies = [];
  for (let i = 1; i < sightings.length; i++) {
    const prev = sightings[i - 1];
    const curr = sightings[i];
    // need camera geo locations
    const camPrev = await require('../models/Camera').findOne({ cameraId: prev.cameraId }).lean();
    const camCurr = await require('../models/Camera').findOne({ cameraId: curr.cameraId }).lean();
    if (!camPrev || !camCurr) continue;
    const distanceKm = haversine(camPrev.latitude, camPrev.longitude, camCurr.latitude, camCurr.longitude);
    const timeHours = (new Date(curr.timestamp) - new Date(prev.timestamp)) / (1000 * 60 * 60);
    if (timeHours <= 0) continue;
    const speed = distanceKm / timeHours;
    if (speed > IMPOSSIBLE_SPEED_KMH) {
      anomalies.push({
        type: 'ImpossibleTravel',
        description: `Travel speed ${speed.toFixed(1)} km/h exceeds ${IMPOSSIBLE_SPEED_KMH} km/h between ${prev.cameraId} and ${curr.cameraId}`,
        confidence: Math.min(1, speed / IMPOSSIBLE_SPEED_KMH),
        status: 'Potential',
        requiresHumanVerification: true,
        relatedSightingIds: [prev._id, curr._id],
      });
    }
  }
  return anomalies;
}

/**
 * Detect watchlist match for a given plate.
 */
async function detectWatchlistMatch(plate) {
  const entry = await WatchlistVehicle.findOne({ plate }).lean();
  if (entry) {
    return [{
      type: 'WatchlistMatch',
      description: `Plate ${plate} matches watchlist: ${entry.reason}`,
      confidence: 1,
      status: 'Potential',
      relatedSightingIds: []
    }];
  }
  return [];
}

/**
 * Detect prolonged stoppage: same camera with gap > 2 hours.
 */
async function detectProlongedStoppage(sightings) {
  const anomalies = [];
  const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
  for (let i = 1; i < sightings.length; i++) {
    const prev = sightings[i - 1];
    const curr = sightings[i];
    if (prev.cameraId === curr.cameraId) {
      const delta = new Date(curr.timestamp) - new Date(prev.timestamp);
      if (delta > TWO_HOURS_MS) {
        anomalies.push({
          type: 'ProlongedStoppage',
          description: `Same camera ${prev.cameraId} with ${Math.round(delta / (60 * 1000))} minutes gap`,
          confidence: 1,
          status: 'Potential',
          relatedSightingIds: [prev._id, curr._id]
        });
      }
    }
  }
  return anomalies;
}

/**
 * Detect suspicious route: non‑monotonic direction changes (simple heuristic).
 */
async function detectSuspiciousRoute(sightings) {
  const anomalies = [];
  const directions = sightings.map(s => s.direction);
  const unique = [...new Set(directions)];
  if (unique.length > 2) { // arbitrary simple rule
    anomalies.push({
      type: 'SuspiciousRoute',
      description: 'Vehicle direction changes across multiple cameras',
      confidence: 0.7,
      status: 'Potential',
      relatedSightingIds: sightings.map(s => s._id)
    });
  }
  return anomalies;
}

/**
 * Run all anomaly detectors for a plate's sightings.
 */
async function runAllDetectors(sightings) {
  const plate = sightings[0]?.plateNumber;
  const results = [];
  results.push(...(await detectImpossibleTravel(sightings)));
  if (plate) results.push(...(await detectWatchlistMatch(plate)));
  results.push(...(await detectProlongedStoppage(sightings)));
  results.push(...(await detectSuspiciousRoute(sightings)));
  return results;
}

module.exports = {
  detectImpossibleTravel,
  detectWatchlistMatch,
  detectProlongedStoppage,
  detectSuspiciousRoute,
  runAllDetectors,
};

