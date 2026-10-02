const express = require('express');
const router = express.Router();
const trafficAnalyticsService = require('../services/trafficAnalyticsService');

router.get('/', async (req, res, next) => {
  try {
    const data = await trafficAnalyticsService.getAnalytics();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

