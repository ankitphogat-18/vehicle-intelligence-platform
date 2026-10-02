const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      default: 'STOLEN_VEHICLE',
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
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'RESOLVED'],
      default: 'ACTIVE',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Alert', alertSchema);
