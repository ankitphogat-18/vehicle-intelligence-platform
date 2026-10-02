const express = require('express');
const router = express.Router();
const VehicleSighting = require('../models/VehicleSighting');
const Camera = require('../models/Camera');
const Anomaly = require('../models/Anomaly');
const WatchlistVehicle = require('../models/WatchlistVehicle');

// Dashboard aggregation
router.get('/', async (req, res, next) => {
  try {
    const totalCameras = await Camera.countDocuments();
    const onlineCameras = await Camera.countDocuments({ status: 'ONLINE' });
    const offlineCameras = await Camera.countDocuments({ status: 'OFFLINE' });
    const totalSightings = await VehicleSighting.countDocuments();
    const activeAlerts = await Anomaly.countDocuments({ status: 'Potential' });
    const watchlistMatches = await WatchlistVehicle.countDocuments();
    const suspiciousJourneys = await Anomaly.countDocuments({ type: { $in: ['ImpossibleTravel','SuspiciousRoute'] } });
    res.json({ success: true, data: { totalCameras, onlineCameras, offlineCameras, totalSightings, activeAlerts, watchlistMatches, suspiciousJourneys } });
  } catch (err) { next(err); }
});

module.exports = router;

