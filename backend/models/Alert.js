const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      default: 'STOLEN_VEHICLE',
    },
    title: {
      type: String,
    },
    message: {
      type: String,
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
      required: false,
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
    latitude: {
      type: Number,
    },
    longitude: {
      type: Number,
    },
    photoUrl: {
      type: String,
    },
    evidencePhotoUrl: {
      type: String,
    },
    incidentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Incident',
      required: false,
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
