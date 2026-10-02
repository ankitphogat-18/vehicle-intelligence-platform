// backend/seed/seedData.js
/**
 * Deterministic demo data for Vehicle Intelligence Core.
 * Run manually with: `node backend/seed/seedData.js`
 * This script will insert:
 *   - 8‑10 cameras (already seeded in Phase 2 – will reuse existing).
 *   - Watchlist vehicle (HR26DQ5678).
 *   - Vehicle sightings for four demo scenarios (DL01AB1234, HR26DQ5678, UP16XY9988, CHG001122).
 * It checks for existing data and does not duplicate if already present.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Camera = require('../models/Camera');
const VehicleSighting = require('../models/VehicleSighting');
const WatchlistVehicle = require('../models/WatchlistVehicle');

async function seed() {
  await connectDB();
  // Ensure cameras exist – assume Phase 2 seed already populated.
  const cameraCount = await Camera.countDocuments();
  if (cameraCount < 8) {
    console.log('Please run Phase 2 camera seed first (not part of this build).');
  }

  // Watchlist entry
  const watchPlate = 'HR26DQ5678';
  const existingWatch = await WatchlistVehicle.findOne({ plate: watchPlate });
  if (!existingWatch) {
    await WatchlistVehicle.create({ plate: watchPlate, reason: 'Stolen vehicle watchlist' });
    console.log('Watchlist entry added');
  } else {
    console.log('Watchlist entry already exists');
  }

  // Helper to create a sighting
  async function createSighting({ cameraId, timestamp, plateNumber, vehicleType, vehicleColor, direction, sourceType, make, model }) {
    const exists = await VehicleSighting.findOne({ cameraId, timestamp: new Date(timestamp), plateNumber });
    if (!exists) {
      await VehicleSighting.create({
        cameraId,
        timestamp: new Date(timestamp),
        plateNumber,
        plateConfidence: 0.9,
        vehicleType: vehicleType || 'SEDAN',
        vehicleMake: make || 'Toyota',
        vehicleModel: model || 'Corolla',
        vehicleColor: vehicleColor || 'WHITE',
        direction: direction || 'INBOUND',
        sourceType: sourceType || 'SIMULATED_FEED',
      });
      console.log(`Sighting added: ${plateNumber} @ ${cameraId}`);
    }
  }

  // Demo A – normal journey across three cameras
  await createSighting({
    cameraId: 'CAM01',
    timestamp: '2026-08-01T08:00:00Z',
    plateNumber: 'DL01AB1234',
    direction: 'INBOUND'
  });
  await createSighting({
    cameraId: 'CAM03',
    timestamp: '2026-08-01T08:05:00Z',
    plateNumber: 'DL01AB1234',
    direction: 'INBOUND'
  });
  await createSighting({
    cameraId: 'CAM07',
    timestamp: '2026-08-01T08:12:00Z',
    plateNumber: 'DL01AB1234',
    direction: 'INBOUND'
  });

  // Demo B – watchlist vehicle (same plate as watchlist)
  await createSighting({
    cameraId: 'CAM02',
    timestamp: '2026-08-02T14:30:00Z',
    plateNumber: watchPlate,
    direction: 'OUTBOUND'
  });

  // Demo C – impossible travel (far apart cameras, short interval)
  await createSighting({
    cameraId: 'CAM-004',
    timestamp: '2026-08-03T10:00:00Z',
    plateNumber: 'UP16XY9988',
    direction: 'INBOUND'
  });
  await createSighting({
    cameraId: 'CAM-009',
    timestamp: '2026-08-03T10:00:10Z',
    plateNumber: 'UP16XY9988',
    direction: 'INBOUND'
  });

  // Demo D – changed/missing plate (first sighting with plate, second missing)
  await createSighting({
    cameraId: 'CAM05',
    timestamp: '2026-08-04T09:00:00Z',
    plateNumber: 'CHG001122',
    direction: 'INBOUND'
  });
  await VehicleSighting.create({
    cameraId: 'CAM06',
    timestamp: new Date('2026-08-04T09:05:00Z'),
    plateNumber: 'UNKNOWN', // missing plate scenario
    plateConfidence: 0.0,
    vehicleType: 'SEDAN',
    vehicleMake: 'Toyota',
    vehicleModel: 'Corolla',
    vehicleColor: 'WHITE',
    direction: 'INBOUND',
    sourceType: 'SIMULATED_FEED',
  });

  console.log('Demo data seeding complete');
  process.exit();
}

seed().catch(err => {
  console.error('Seeding error:', err);
  process.exit(1);
});

