const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      default: 'STOLEN_VEHICLE',
    },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'HIGH',
    },
    description: {
      type: String,
    },
    plateNumber: {
      type: String,
      required: true,
      uppercase: true,
      index: true,
    },
    vehicleDetails: {
      makeModel: {
        type: String,
      },
      color: {
        type: String,
      },
    },
    locationName: {
      type: String,
    },
    cameraId: {
      type: String,
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'RESOLVED', 'DISMISSED'],
      default: 'ACTIVE',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Alert', alertSchema);
