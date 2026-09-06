const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Camera = require('../models/Camera');
const Detection = require('../models/Detection');

// Load environment variables from backend/.env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const sampleCameras = [
  {
    cameraId: 'CAM-001',
    name: 'Connaught Place Radial Junction',
    type: 'ANPR',
    location: 'Connaught Place Outer Circle, New Delhi',
    latitude: 28.6328,
    longitude: 77.2197,
    junction: 'CP Radial Gate 1',
    status: 'ONLINE',
    direction: 'INBOUND',
    sourceType: 'SYNTHETIC_FEED',
    streamUrl: 'sim_feed_cam_001'
  },
  {
    cameraId: 'CAM-002',
    name: 'Ring Road AIIMS Flyover North Exit',
    type: 'SPEED_ENFORCEMENT',
    location: 'Ring Road at Aurobindo Marg Interchange',
    latitude: 28.5672,
    longitude: 77.2100,
    junction: 'AIIMS Flyover North',
    status: 'ONLINE',
    direction: 'NORTH',
    sourceType: 'SYNTHETIC_FEED',
    streamUrl: 'sim_feed_cam_002'
  },
  {
    cameraId: 'CAM-003',
    name: 'NH-48 Delhi-Gurugram Expressway Toll',
    type: 'TOLL_CHECKPOINT',
    location: 'NH-48 Border Checkpoint Plaza',
    latitude: 28.5020,
    longitude: 77.0870,
    junction: 'Sirhaul Toll Plaza',
    status: 'ONLINE',
    direction: 'OUTBOUND',
    sourceType: 'SYNTHETIC_FEED',
    streamUrl: 'sim_feed_cam_003'
  },
  {
    cameraId: 'CAM-004',
    name: 'Lajpat Nagar Central Market Road',
    type: 'CCTV_FIXED',
    location: 'Feroze Gandhi Road, Central Market',
    latitude: 28.5694,
    longitude: 77.2415,
    junction: 'Market Main Entry',
    status: 'ONLINE',
    direction: 'BIDIRECTIONAL',
    sourceType: 'SYNTHETIC_FEED',
    streamUrl: 'sim_feed_cam_004'
  },
  {
    cameraId: 'CAM-005',
    name: 'Cyber City IT Corridor Gate 2',
    type: 'ANPR',
    location: 'DLF Cyber City Boulevard',
    latitude: 28.4950,
    longitude: 77.0890,
    junction: 'Cyber City Commercial Entry',
    status: 'ONLINE',
    direction: 'INBOUND',
    sourceType: 'SYNTHETIC_FEED',
    streamUrl: 'sim_feed_cam_005'
  },
  {
    cameraId: 'CAM-006',
    name: 'South Ex Hospital Corridor Express',
    type: 'TRAFFIC',
    location: 'Ring Road Hospital Emergency Access',
    latitude: 28.5726,
    longitude: 77.2215,
    junction: 'Hospital Corridor Junction',
    status: 'ONLINE',
    direction: 'EAST',
    sourceType: 'SYNTHETIC_FEED',
    streamUrl: 'sim_feed_cam_006'
  },
  {
    cameraId: 'CAM-007',
    name: 'Mayapuri Industrial Area Phase 2 Gate',
    type: 'CCTV_FIXED',
    location: 'Mayapuri Industrial Area Main Arterial',
    latitude: 28.6350,
    longitude: 77.1260,
    junction: 'Industrial Phase 2 Cross',
    status: 'ONLINE',
    direction: 'WEST',
    sourceType: 'SYNTHETIC_FEED',
    streamUrl: 'sim_feed_cam_007'
  },
  {
    cameraId: 'CAM-008',
    name: 'Vasant Kunj Residential Sector D',
    type: 'PTZ',
    location: 'Nelson Mandela Marg Sector D Entry',
    latitude: 28.5280,
    longitude: 77.1550,
    junction: 'Sector D Main Gate',
    status: 'ONLINE',
    direction: 'BIDIRECTIONAL',
    sourceType: 'SYNTHETIC_FEED',
    streamUrl: 'sim_feed_cam_008'
  },
  {
    cameraId: 'CAM-009',
    name: 'Old Delhi Railway Station Transit Hub',
    type: 'ANPR',
    location: 'Station Road Arterial Transit Loop',
    latitude: 28.6610,
    longitude: 77.2300,
    junction: 'Railway Plaza Approach',
    status: 'OFFLINE',
    direction: 'SOUTH',
    sourceType: 'SYNTHETIC_FEED',
    streamUrl: 'sim_feed_cam_009'
  }
];

const now = new Date();
const baseTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0);

const sampleObservations = [
  // Vehicle A (DL01AB1234 - White Sedan): CAM-001 -> CAM-003 -> CAM-005
  {
    cameraId: 'CAM-001',
    timestamp: new Date(baseTime.getTime() + 5 * 60000), // 09:05
    plateNumber: 'DL01AB1234',
    plateConfidence: 0.96,
    vehicleType: 'SEDAN',
    vehicleColor: 'White',
    direction: 'INBOUND',
    speed: 42,
    sourceType: 'SIMULATED_FEED',
    lane: 2
  },
  {
    cameraId: 'CAM-003',
    timestamp: new Date(baseTime.getTime() + 28 * 60000), // 09:28
    plateNumber: 'DL01AB1234',
    plateConfidence: 0.94,
    vehicleType: 'SEDAN',
    vehicleColor: 'White',
    direction: 'OUTBOUND',
    speed: 78,
    sourceType: 'SIMULATED_FEED',
    lane: 1
  },
  {
    cameraId: 'CAM-005',
    timestamp: new Date(baseTime.getTime() + 39 * 60000), // 09:39
    plateNumber: 'DL01AB1234',
    plateConfidence: 0.98,
    vehicleType: 'SEDAN',
    vehicleColor: 'White',
    direction: 'INBOUND',
    speed: 35,
    sourceType: 'SIMULATED_FEED',
    lane: 1
  },

  // Vehicle B (HR26DQ5678 - Black SUV): CAM-002 -> CAM-004 -> CAM-006
  {
    cameraId: 'CAM-002',
    timestamp: new Date(baseTime.getTime() + 15 * 60000), // 09:15
    plateNumber: 'HR26DQ5678',
    plateConfidence: 0.95,
    vehicleType: 'SUV',
    vehicleColor: 'Black',
    direction: 'NORTH',
    speed: 68,
    sourceType: 'SIMULATED_FEED',
    lane: 1
  },
  {
    cameraId: 'CAM-004',
    timestamp: new Date(baseTime.getTime() + 32 * 60000), // 09:32
    plateNumber: 'HR26DQ5678',
    plateConfidence: 0.91,
    vehicleType: 'SUV',
    vehicleColor: 'Black',
    direction: 'BIDIRECTIONAL',
    speed: 28,
    sourceType: 'SIMULATED_FEED',
    lane: 2
  },
  {
    cameraId: 'CAM-006',
    timestamp: new Date(baseTime.getTime() + 44 * 60000), // 09:44
    plateNumber: 'HR26DQ5678',
    plateConfidence: 0.97,
    vehicleType: 'SUV',
    vehicleColor: 'Black',
    direction: 'EAST',
    speed: 46,
    sourceType: 'SIMULATED_FEED',
    lane: 1
  },

  // Vehicle C (UP16XY9988 - Silver Hatchback): CAM-001 -> CAM-002 -> CAM-007
  {
    cameraId: 'CAM-001',
    timestamp: new Date(baseTime.getTime() + 70 * 60000), // 10:10
    plateNumber: 'UP16XY9988',
    plateConfidence: 0.93,
    vehicleType: 'HATCHBACK',
    vehicleColor: 'Silver',
    direction: 'INBOUND',
    speed: 40,
    sourceType: 'SIMULATED_FEED',
    lane: 3
  },
  {
    cameraId: 'CAM-002',
    timestamp: new Date(baseTime.getTime() + 82 * 60000), // 10:22
    plateNumber: 'UP16XY9988',
    plateConfidence: 0.89,
    vehicleType: 'HATCHBACK',
    vehicleColor: 'Silver',
    direction: 'NORTH',
    speed: 62,
    sourceType: 'SIMULATED_FEED',
    lane: 2
  },
  {
    cameraId: 'CAM-007',
    timestamp: new Date(baseTime.getTime() + 106 * 60000), // 10:46
    plateNumber: 'UP16XY9988',
    plateConfidence: 0.92,
    vehicleType: 'HATCHBACK',
    vehicleColor: 'Silver',
    direction: 'WEST',
    speed: 34,
    sourceType: 'SIMULATED_FEED',
    lane: 1
  },

  // Vehicle D (DL04CD4321 - Red Sedan): CAM-003 -> CAM-008
  {
    cameraId: 'CAM-003',
    timestamp: new Date(baseTime.getTime() + 40 * 60000), // 09:40
    plateNumber: 'DL04CD4321',
    plateConfidence: 0.94,
    vehicleType: 'SEDAN',
    vehicleColor: 'Red',
    direction: 'OUTBOUND',
    speed: 72,
    sourceType: 'SIMULATED_FEED',
    lane: 2
  },
  {
    cameraId: 'CAM-008',
    timestamp: new Date(baseTime.getTime() + 65 * 60000), // 10:05
    plateNumber: 'DL04CD4321',
    plateConfidence: 0.90,
    vehicleType: 'SEDAN',
    vehicleColor: 'Red',
    direction: 'BIDIRECTIONAL',
    speed: 30,
    sourceType: 'SIMULATED_FEED',
    lane: 1
  },

  // Vehicle E (HR55TR1122 - Blue Truck): CAM-007 -> CAM-003
  {
    cameraId: 'CAM-007',
    timestamp: new Date(baseTime.getTime() - 90 * 60000), // 07:30
    plateNumber: 'HR55TR1122',
    plateConfidence: 0.91,
    vehicleType: 'TRUCK',
    vehicleColor: 'Blue',
    direction: 'WEST',
    speed: 38,
    sourceType: 'SIMULATED_FEED',
    lane: 1
  },
  {
    cameraId: 'CAM-003',
    timestamp: new Date(baseTime.getTime() - 45 * 60000), // 08:15
    plateNumber: 'HR55TR1122',
    plateConfidence: 0.88,
    vehicleType: 'TRUCK',
    vehicleColor: 'Blue',
    direction: 'OUTBOUND',
    speed: 55,
    sourceType: 'SIMULATED_FEED',
    lane: 3
  }
];

const seedDatabase = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vehicle_intelligence';

  try {
    console.log(`[Seed] Connecting to MongoDB: ${uri}`);
    await mongoose.connect(uri);
    console.log('[Seed] Database connected.');

    // Seed Cameras (upsert by cameraId)
    console.log(`[Seed] Seeding ${sampleCameras.length} simulated cameras...`);
    for (const cam of sampleCameras) {
      await Camera.findOneAndUpdate({ cameraId: cam.cameraId }, cam, {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      });
    }
    console.log('[Seed] Cameras seeded successfully.');

    // Seed Detections (upsert/insert observations)
    console.log(`[Seed] Seeding ${sampleObservations.length} simulated vehicle observations...`);
    // Clear old mock seed detections to avoid stale duplicates
    await Detection.deleteMany({ sourceType: 'SIMULATED_FEED' });
    await Detection.insertMany(sampleObservations);
    console.log('[Seed] Vehicle observations seeded successfully.');

    console.log('\n=============================================');
    console.log('Phase 2 Seed Completed Successfully:');
    console.log(`- Cameras: ${sampleCameras.length} registered`);
    console.log(`- Vehicle Observations: ${sampleObservations.length} logged`);
    console.log('=============================================\n');

    process.exit(0);
  } catch (error) {
    console.error('[Seed Error]:', error.message);
    process.exit(1);
  }
};

seedDatabase();

