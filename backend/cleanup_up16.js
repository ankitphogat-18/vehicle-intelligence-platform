const mongoose = require('mongoose');
const VehicleSighting = require('./models/VehicleSighting');

async function run() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/vehicle_intelligence');
    // Delete duplicate impossible‑travel sightings referencing old camera IDs
    const delResult = await VehicleSighting.deleteMany({
      plateNumber: 'UP16XY9988',
      cameraId: { $in: ['CAM04', 'CAM09'] }
    });
    console.log('Deleted duplicate UP16XY9988 sightings:', delResult.deletedCount);
    // Verify changed/missing‑plate sightings exist
    const chgDocs = await VehicleSighting.find({ plateNumber: { $in: ['CHG001122', 'UNKNOWN'] } }).lean();
    console.log('CHG001122 / UNKNOWN sightings count:', chgDocs.length);
    console.log('Documents:', chgDocs);
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error during cleanup:', err);
    process.exit(1);
  }
}

run();

