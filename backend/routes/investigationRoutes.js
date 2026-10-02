// backend/routes/investigationRoutes.js
const express = require('express');
const router = express.Router();
const InvestigationCase = require('../models/InvestigationCase');
const VehicleSighting = require('../models/VehicleSighting');
const Anomaly = require('../models/Anomaly');

// Create a new investigation case
router.post('/', async (req, res, next) => {
  try {
    const { vehiclePlate, title, notes, evidence, anomalyIds, sightingIds } = req.body;
    const caseDoc = await InvestigationCase.create({
      vehiclePlate: vehiclePlate?.trim().toUpperCase(),
      title,
      notes,
      evidence: evidence || [],
      anomalyIds: anomalyIds || [],
      sightingIds: sightingIds || [],
    });
    res.json({ success: true, data: caseDoc });
  } catch (err) {
    next(err);
  }
});

// Get all investigations (basic list)
router.get('/', async (req, res, next) => {
  try {
    const cases = await InvestigationCase.find().lean();
    res.json({ success: true, data: cases });
  } catch (err) {
    next(err);
  }
});

// Get a specific investigation with populated references
router.get('/:id', async (req, res, next) => {
  try {
    const inv = await InvestigationCase.findById(req.params.id)
      .populate('anomalyIds')
      .populate('sightingIds')
      .lean();
    if (!inv) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: inv });
  } catch (err) {
    next(err);
  }
});

// Update investigation (status, notes, evidence)
router.put('/:id', async (req, res, next) => {
  try {
    const updates = {};
    const allowed = ['status', 'notes', 'evidence'];
    allowed.forEach(f => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });
    const updated = await InvestigationCase.findByIdAndUpdate(req.params.id, updates, { new: true }).lean();
    if (!updated) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

