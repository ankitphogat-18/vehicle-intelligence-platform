const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Camera = require('../models/Camera');
const Sighting = require('../models/Sighting');
const VehicleSighting = require('../models/VehicleSighting');
const Vehicle = require('../models/Vehicle');
const Alert = require('../models/Alert');
const User = require('../models/User');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const CHANDIGARH_CAMERAS = [
  {
    cameraId: 'CAM-CHD-01',
    name: 'Tribune Chowk (Sector 29/31)',
    locationName: 'Tribune Chowk (Sector 29/31)',
    location: 'Dakshin Marg & Purv Marg Intersection, Sector 29/31',
    latitude: 30.7046,
    longitude: 76.7978,
    sector: 'Sector 29/31',
    junction: 'Tribune Radial Chowk',
    type: 'ANPR',
    status: 'ONLINE',
    direction: 'NORTH_SOUTH',
    sourceType: 'LIVE_CCTV',
    streamUrl: 'sim_feed_cam_chd_01'
  },
  {
    cameraId: 'CAM-CHD-02',
    name: 'Sector 17 Plaza Radial Junction',
    locationName: 'Sector 17 Plaza Radial Junction',
    location: 'Jan Marg & Udyog Path Corridor, Sector 17',
    latitude: 30.7398,
    longitude: 76.7827,
    sector: 'Sector 17',
    junction: 'Plaza Radial Gate',
    type: 'ANPR',
    status: 'ONLINE',
    direction: 'INBOUND',
    sourceType: 'LIVE_CCTV',
    streamUrl: 'sim_feed_cam_chd_02'
  },
  {
    cameraId: 'CAM-CHD-03',
    name: 'ISBT Sector 43 Chowk',
    locationName: 'ISBT Sector 43 Chowk',
    location: 'Himalaya Marg & ISBT Terminal Approach, Sector 43',
    latitude: 30.7228,
    longitude: 76.7441,
    sector: 'Sector 43',
    junction: 'ISBT 43 Main Rotary',
    type: 'SPEED_ENFORCEMENT',
    status: 'ONLINE',
    direction: 'BIDIRECTIONAL',
    sourceType: 'LIVE_CCTV',
    streamUrl: 'sim_feed_cam_chd_03'
  },
  {
    cameraId: 'CAM-CHD-04',
    name: 'Transport Chowk (Madhya Marg)',
    locationName: 'Transport Chowk (Madhya Marg)',
    location: 'Madhya Marg & Purv Marg Corridor, Sector 26',
    latitude: 30.7231,
    longitude: 76.8157,
    sector: 'Sector 26',
    junction: 'Transport Chowk Flyover',
    type: 'TOLL_CHECKPOINT',
    status: 'ONLINE',
    direction: 'EAST_WEST',
    sourceType: 'LIVE_CCTV',
    streamUrl: 'sim_feed_cam_chd_04'
  },
  {
    cameraId: 'CAM-CHD-05',
    name: 'Housing Board Chowk (Panchkula Border)',
    locationName: 'Housing Board Chowk (Panchkula Border)',
    location: 'Chandigarh-Panchkula Inter-State Arterial Checkpoint',
    latitude: 30.7189,
    longitude: 76.8423,
    sector: 'Manimajra / Panchkula Border',
    junction: 'Housing Board Inter-State Gate',
    type: 'ANPR',
    status: 'ONLINE',
    direction: 'OUTBOUND',
    sourceType: 'LIVE_CCTV',
    streamUrl: 'sim_feed_cam_chd_05'
  },
  {
    cameraId: 'CAM-CHD-06',
    name: 'PGI / Panjab University Chowk',
    locationName: 'PGI / Panjab University Chowk',
    location: 'Madhya Marg Hospital Emergency Corridor, Sector 12/14',
    latitude: 30.7651,
    longitude: 76.7766,
    sector: 'Sector 12/14',
    junction: 'PGI Medical Hub Junction',
    type: 'CCTV_FIXED',
    status: 'ONLINE',
    direction: 'BIDIRECTIONAL',
    sourceType: 'LIVE_CCTV',
    streamUrl: 'sim_feed_cam_chd_06'
  },
  {
    cameraId: 'CAM-CHD-07',
    name: 'IT Park Entry Junction',
    locationName: 'IT Park Entry Junction',
    location: 'Kishangarh-IT Park Main Boulevard, Sector 13',
    latitude: 30.7302,
    longitude: 76.8378,
    sector: 'IT Park / Manimajra',
    junction: 'Technology Park Arterial Gate',
    type: 'ANPR',
    status: 'ONLINE',
    direction: 'INBOUND',
    sourceType: 'LIVE_CCTV',
    streamUrl: 'sim_feed_cam_chd_07'
  },
  {
    cameraId: 'CAM-CHD-08',
    name: 'Zirakpur-Airport Road Barrier',
    locationName: 'Zirakpur-Airport Road Barrier',
    location: 'PR7 International Airport Expressway Checkpoint',
    latitude: 30.6521,
    longitude: 76.8214,
    sector: 'Airport Road Corridor',
    junction: 'Airport Expressway Highway Barrier',
    type: 'SPEED_ENFORCEMENT',
    status: 'ONLINE',
    direction: 'INBOUND',
    sourceType: 'LIVE_CCTV',
    streamUrl: 'sim_feed_cam_chd_08'
  }
];

const connectDB = require('../config/db');

async function seedChandigarhMaster() {
  try {
    console.log('[Seed] Connecting to MongoDB Atlas for Chandigarh Camera Seed...');
    await connectDB();
    console.log('[Seed] MongoDB Atlas connected.');

    // 1. Upsert 8 Chandigarh Checkpoints
    console.log(`[Seed] Upserting ${CHANDIGARH_CAMERAS.length} Chandigarh master checkpoints...`);
    for (const cam of CHANDIGARH_CAMERAS) {
      await Camera.findOneAndUpdate({ cameraId: cam.cameraId }, cam, {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      });
    }
    console.log('[Seed] Master Chandigarh checkpoints upserted successfully.');

    // 2. Ensure test citizen user exists
    let citizenUser = await User.findOne({ email: 'citizen@test.com' });
    if (!citizenUser) {
      citizenUser = await User.create({
        name: 'Rajesh Kumar',
        email: 'citizen@test.com',
        password: 'password123',
        role: 'CITIZEN',
        isVerified: true
      });
    }

    // 3. Seed Registered Vehicles & Active Stolen Alert for RJ47CA3205
    const plate = 'RJ47CA3205';
    let stolenVeh = await Vehicle.findOne({ plateNumber: plate });
    if (!stolenVeh) {
      stolenVeh = await Vehicle.create({
        ownerId: citizenUser._id,
        plateNumber: plate,
        makeModel: 'Maruti Suzuki Swift Dzire',
        color: 'Pearl White',
        rcDocumentUrl: '/uploads/rc_documents/rc-demo.pdf',
        verificationStatus: 'APPROVED',
        isVerified: true,
        isStolen: true,
        policeCaseStatus: 'SEARCH_IN_PROGRESS',
        policeNotes: 'Stolen vehicle reported. Sighted moving northbound across Chandigarh corridor checkpoints.',
        statusTimeline: [
          {
            status: 'PENDING',
            updatedAt: new Date(Date.now() - 24 * 3600000),
            message: 'Registration documents submitted by owner.'
          },
          {
            status: 'APPROVED',
            updatedAt: new Date(Date.now() - 20 * 3600000),
            message: 'Vehicle registration approved by State Transport Authority.'
          },
          {
            status: 'SEARCH_IN_PROGRESS',
            updatedAt: new Date(Date.now() - 2 * 3600000),
            message: 'Stolen vehicle reported. Highway intercept patrol and camera radar alert broadcasted.'
          }
        ],
        chalaanHistory: [
          {
            chalaanId: 'CH-2026-9812',
            amount: 1000,
            reason: 'Over-speeding at Madhya Marg corridor',
            date: new Date(Date.now() - 15 * 86400000),
            paid: true
          }
        ]
      });
    }

    // Upsert Active Alert for RJ47CA3205
    await Alert.findOneAndUpdate(
      { plateNumber: plate },
      {
        type: 'STOLEN_VEHICLE',
        plateNumber: plate,
        vehicleDetails: {
          makeModel: 'Maruti Suzuki Swift Dzire',
          color: 'Pearl White'
        },
        reportedBy: citizenUser._id,
        status: 'ACTIVE'
      },
      { upsert: true, new: true }
    );

    // 4. Seed Chronological Sightings across Chandigarh Corridors for RJ47CA3205
    const now = Date.now();
    const rj47Sightings = [
      {
        plateNumber: plate,
        cameraId: 'CAM-CHD-08',
        locationName: 'Zirakpur-Airport Road Barrier',
        timestamp: new Date(now - 75 * 60000),
        confidence: 0.94,
        cropImagePath: '/uploads/crops/crop_1_RJ47CA3205.jpg'
      },
      {
        plateNumber: plate,
        cameraId: 'CAM-CHD-01',
        locationName: 'Tribune Chowk (Sector 29/31)',
        timestamp: new Date(now - 55 * 60000),
        confidence: 0.96,
        cropImagePath: '/uploads/crops/crop_1_RJ47CA3205.jpg'
      },
      {
        plateNumber: plate,
        cameraId: 'CAM-CHD-03',
        locationName: 'ISBT Sector 43 Chowk',
        timestamp: new Date(now - 38 * 60000),
        confidence: 0.91,
        cropImagePath: '/uploads/crops/crop_1_RJ47CA3205.jpg'
      },
      {
        plateNumber: plate,
        cameraId: 'CAM-CHD-02',
        locationName: 'Sector 17 Plaza Radial Junction',
        timestamp: new Date(now - 22 * 60000),
        confidence: 0.98,
        cropImagePath: '/uploads/crops/crop_1_RJ47CA3205.jpg'
      },
      {
        plateNumber: plate,
        cameraId: 'CAM-CHD-06',
        locationName: 'PGI / Panjab University Chowk',
        timestamp: new Date(now - 5 * 60000),
        confidence: 0.93,
        cropImagePath: '/uploads/crops/crop_1_RJ47CA3205.jpg'
      }
    ];

    for (const s of rj47Sightings) {
      await Sighting.findOneAndUpdate(
        { plateNumber: s.plateNumber, cameraId: s.cameraId },
        s,
        { upsert: true, new: true }
      );
      await VehicleSighting.findOneAndUpdate(
        { plateNumber: s.plateNumber, cameraId: s.cameraId },
        {
          ...s,
          plateConfidence: s.confidence,
          vehicleType: 'SEDAN',
          vehicleMake: 'Maruti Suzuki',
          vehicleModel: 'Swift Dzire',
          vehicleColor: 'White',
          direction: 'INBOUND',
          sourceType: 'LIVE_CCTV'
        },
        { upsert: true, new: true }
      );
    }

    // 5. Seed Trajectory for DL01AB1234
    const dl01Sightings = [
      {
        plateNumber: 'DL01AB1234',
        cameraId: 'CAM-CHD-05',
        locationName: 'Housing Board Chowk (Panchkula Border)',
        timestamp: new Date(now - 50 * 60000),
        confidence: 0.95
      },
      {
        plateNumber: 'DL01AB1234',
        cameraId: 'CAM-CHD-07',
        locationName: 'IT Park Entry Junction',
        timestamp: new Date(now - 35 * 60000),
        confidence: 0.92
      },
      {
        plateNumber: 'DL01AB1234',
        cameraId: 'CAM-CHD-04',
        locationName: 'Transport Chowk (Madhya Marg)',
        timestamp: new Date(now - 20 * 60000),
        confidence: 0.97
      },
      {
        plateNumber: 'DL01AB1234',
        cameraId: 'CAM-CHD-02',
        locationName: 'Sector 17 Plaza Radial Junction',
        timestamp: new Date(now - 8 * 60000),
        confidence: 0.94
      }
    ];

    for (const s of dl01Sightings) {
      await Sighting.findOneAndUpdate(
        { plateNumber: s.plateNumber, cameraId: s.cameraId },
        s,
        { upsert: true, new: true }
      );
      await VehicleSighting.findOneAndUpdate(
        { plateNumber: s.plateNumber, cameraId: s.cameraId },
        {
          ...s,
          plateConfidence: s.confidence,
          vehicleType: 'SEDAN',
          vehicleMake: 'Hyundai',
          vehicleModel: 'Verna',
          vehicleColor: 'Silver',
          direction: 'INBOUND',
          sourceType: 'LIVE_CCTV'
        },
        { upsert: true, new: true }
      );
    }

    // 6. Seed Plate-Swap Suspect: RJ17CA1931 (Registered: Silver Alto, Detected: White Celerio)
    const plateSwap1 = 'RJ17CA1931';
    let user2 = await User.findOne({ email: 'owner2@test.com' });
    if (!user2) {
      user2 = await User.create({
        name: 'Vikas Sharma',
        email: 'owner2@test.com',
        password: 'password123',
        phone: '+91 98111 22334',
        role: 'CITIZEN',
        isVerified: true
      });
    }

    await Vehicle.findOneAndUpdate(
      { plateNumber: plateSwap1 },
      {
        ownerId: user2._id,
        plateNumber: plateSwap1,
        makeModel: 'Maruti Suzuki Alto 800',
        color: 'Silver Metallic',
        rcDocumentUrl: '/uploads/rc_documents/rc-alto.pdf',
        verificationStatus: 'APPROVED',
        isVerified: true,
        policeCaseStatus: 'NOT_REPORTED',
        policeNotes: 'Standard citizen vehicle.',
        statusTimeline: [
          { status: 'APPROVED', message: 'RC verified by RTO.', updatedAt: new Date(now - 30 * 86400000) }
        ],
        chalaanHistory: [
          { chalaanId: 'CH-2026-1102', amount: 500, reason: 'Improper Parking', date: new Date(now - 10 * 86400000), paid: true }
        ]
      },
      { upsert: true, new: true }
    );

    // Sighting with Plate-Swap Discrepancy (Camera spotted White Celerio instead of Silver Alto)
    await Sighting.findOneAndUpdate(
      { plateNumber: plateSwap1, cameraId: 'CAM-CHD-02' },
      {
        plateNumber: plateSwap1,
        cameraId: 'CAM-CHD-02',
        locationName: 'Sector 17 Plaza Radial Junction',
        timestamp: new Date(now - 15 * 60000),
        confidence: 0.96,
        cropImagePath: '/uploads/crops/crop_2_RJ37CA1931.jpg'
      },
      { upsert: true, new: true }
    );
    await VehicleSighting.findOneAndUpdate(
      { plateNumber: plateSwap1, cameraId: 'CAM-CHD-02' },
      {
        plateNumber: plateSwap1,
        cameraId: 'CAM-CHD-02',
        locationName: 'Sector 17 Plaza Radial Junction',
        timestamp: new Date(now - 15 * 60000),
        plateConfidence: 0.96,
        vehicleType: 'HATCHBACK',
        vehicleMake: 'Maruti Suzuki',
        vehicleModel: 'Celerio VXi',
        vehicleColor: 'White',
        direction: 'INBOUND',
        sourceType: 'LIVE_CCTV'
      },
      { upsert: true, new: true }
    );

    // 7. Seed Plate-Swap Suspect: HR10AX4421 (Registered: Black Scorpio, Detected: Red i20)
    const plateSwap2 = 'HR10AX4421';
    await Vehicle.findOneAndUpdate(
      { plateNumber: plateSwap2 },
      {
        ownerId: user2._id,
        plateNumber: plateSwap2,
        makeModel: 'Mahindra Scorpio Classic',
        color: 'Diamond Black',
        rcDocumentUrl: '/uploads/rc_documents/rc-scorpio.pdf',
        verificationStatus: 'APPROVED',
        isVerified: true,
        policeCaseStatus: 'NOT_REPORTED',
        policeNotes: 'Heavy commercial SUV profile.',
        statusTimeline: [
          { status: 'APPROVED', message: 'RC verified by RTO.', updatedAt: new Date(now - 60 * 86400000) }
        ]
      },
      { upsert: true, new: true }
    );

    await Sighting.findOneAndUpdate(
      { plateNumber: plateSwap2, cameraId: 'CAM-CHD-01' },
      {
        plateNumber: plateSwap2,
        cameraId: 'CAM-CHD-01',
        locationName: 'Tribune Chowk (Sector 29/31)',
        timestamp: new Date(now - 40 * 60000),
        confidence: 0.93
      },
      { upsert: true, new: true }
    );
    await VehicleSighting.findOneAndUpdate(
      { plateNumber: plateSwap2, cameraId: 'CAM-CHD-01' },
      {
        plateNumber: plateSwap2,
        cameraId: 'CAM-CHD-01',
        locationName: 'Tribune Chowk (Sector 29/31)',
        timestamp: new Date(now - 40 * 60000),
        plateConfidence: 0.93,
        vehicleType: 'HATCHBACK',
        vehicleMake: 'Hyundai',
        vehicleModel: 'i20 Asta',
        vehicleColor: 'Red',
        direction: 'SOUTH',
        sourceType: 'LIVE_CCTV'
      },
      { upsert: true, new: true }
    );

    console.log('[Seed] Chandigarh Master Checkpoints & Trajectories seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('[Seed Error]:', err);
    process.exit(1);
  }
}

seedChandigarhMaster();
