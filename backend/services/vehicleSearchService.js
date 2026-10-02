// vehicleSearchService.js – provides search by normalized plate
const VehicleSighting = require('../models/VehicleSighting');

/**
 * Search for vehicle sightings by normalized plate number.
 * Returns sightings sorted chronologically (ascending).
 * @param {string} plate - normalized plate (uppercase)
 * @returns {Promise<Array>} array of VehicleSighting docs
 */
async function searchByPlate(plate) {
  if (!plate) return [];
  const normalized = plate.trim().toUpperCase();
  const sightings = await VehicleSighting.find({ plateNumber: normalized })
    .sort({ timestamp: 1 })
    .lean();
  return sightings;
}

module.exports = { searchByPlate };

