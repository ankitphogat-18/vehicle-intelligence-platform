// backend/services/reidentificationService.js
const VehicleSighting = require('../models/VehicleSighting');
const WatchlistVehicle = require('../models/WatchlistVehicle');

/**
 * Compute a deterministic match confidence between two sightings based on
 * plate (exact match gives high weight), vehicleType, make, model, color.
 * Returns a score between 0 and 1.
 */
function computeMatchScore(a, b) {
  let score = 0;
  const weight = {
    plate: 0.5,
    vehicleType: 0.15,
    make: 0.1,
    model: 0.1,
    color: 0.15,
  };
  if (a.plateNumber && b.plateNumber && a.plateNumber === b.plateNumber) score += weight.plate;
  if (a.vehicleType && b.vehicleType && a.vehicleType === b.vehicleType) score += weight.vehicleType;
  if (a.vehicleMake && b.vehicleMake && a.vehicleMake === b.vehicleMake) score += weight.make;
  if (a.vehicleModel && b.vehicleModel && a.vehicleModel === b.vehicleModel) score += weight.model;
  if (a.vehicleColor && b.vehicleColor && a.vehicleColor === b.vehicleColor) score += weight.color;
  return Math.min(1, score);
}

/**
 * Find potential matches for a given sighting.
 * Returns an array of { sightingId, confidence, requiresHumanVerification }.
 */
async function findPotentialMatches(sighting) {
  // Find other sightings with same plate or similar attributes
  const candidates = await VehicleSighting.find({
    _id: { $ne: sighting._id },
    // at least one overlapping attribute to limit search
    $or: [
      { plateNumber: sighting.plateNumber },
      { vehicleType: sighting.vehicleType },
      { vehicleMake: sighting.vehicleMake },
      { vehicleModel: sighting.vehicleModel },
      { vehicleColor: sighting.vehicleColor },
    ],
  }).lean();

  const matches = [];
  for (const c of candidates) {
    const confidence = computeMatchScore(sighting, c);
    if (confidence > 0) {
      matches.push({
        sightingId: c._id,
        confidence,
        requiresHumanVerification: confidence < 0.8,
      });
    }
  }
  return matches;
}

module.exports = { computeMatchScore, findPotentialMatches };

