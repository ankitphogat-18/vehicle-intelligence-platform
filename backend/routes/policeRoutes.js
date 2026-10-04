const express = require('express');
const router = express.Router();
const Vehicle = require('../models/Vehicle');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

/**
 * GET /api/police/pending-verifications
 * Get all unverified vehicles pending review (Police only)
 */
router.get(
  '/pending-verifications',
  authenticate,
  requireRole(['POLICE']),
  async (req, res, next) => {
    try {
      const pendingVehicles = await Vehicle.find({
        $or: [{ isVerified: false }, { verificationStatus: 'PENDING' }]
      })
        .populate('ownerId', 'name email')
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        count: pendingVehicles.length,
        data: pendingVehicles
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/police/verify-vehicle/:id
 * Approve or reject a vehicle registration document (Police only)
 */
router.patch(
  '/verify-vehicle/:id',
  authenticate,
  requireRole(['POLICE']),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { action, notes } = req.body;

      if (!action || !['APPROVE', 'REJECT'].includes(action)) {
        return res.status(400).json({
          success: false,
          error: 'ValidationError',
          message: "Action must be either 'APPROVE' or 'REJECT'"
        });
      }

      const vehicle = await Vehicle.findById(id);
      if (!vehicle) {
        return res.status(404).json({
          success: false,
          error: 'NotFound',
          message: 'Vehicle registration not found'
        });
      }

      if (action === 'APPROVE') {
        vehicle.isVerified = true;
        vehicle.verificationStatus = 'APPROVED';
        vehicle.policeNotes = notes || 'Registration and RC documents verified & approved by Cyber Cell.';
        if (!vehicle.statusTimeline) vehicle.statusTimeline = [];
        vehicle.statusTimeline.push({
          status: 'APPROVED',
          message: 'Documents verified and approved by Cyber Cell & Traffic Authority.',
          updatedAt: new Date()
        });
        const updatedVehicle = await vehicle.save();

        return res.json({
          success: true,
          message: `Vehicle '${vehicle.plateNumber}' approved and verified`,
          data: updatedVehicle
        });
      } else if (action === 'REJECT') {
        vehicle.isVerified = false;
        vehicle.verificationStatus = 'REJECTED';
        vehicle.policeNotes = notes || 'Registration documents rejected due to discrepancies in proof.';
        if (!vehicle.statusTimeline) vehicle.statusTimeline = [];
        vehicle.statusTimeline.push({
          status: 'REJECTED',
          message: vehicle.policeNotes,
          updatedAt: new Date()
        });
        const updatedVehicle = await vehicle.save();

        return res.json({
          success: true,
          message: `Vehicle registration for '${vehicle.plateNumber}' marked as REJECTED`,
          data: updatedVehicle
        });
      }
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
