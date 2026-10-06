const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema(
  {
    incidentType: {
      type: String,
      enum: ['ACCIDENT', 'HIT_AND_RUN'],
      required: true,
    },
    locationName: {
      type: String,
      required: true,
    },
    cameraId: {
      type: String,
      required: true,
    },
    incidentStartTime: {
      type: Date,
      required: true,
    },
    incidentEndTime: {
      type: Date,
      required: true,
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    description: {
      type: String,
    },
    latitude: {
      type: Number,
    },
    longitude: {
      type: Number,
    },
    evidencePhotoUrl: {
      type: String,
    },
    photoUrl: {
      type: String,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'REPORTED', 'RESOLVED'],
      default: 'ACTIVE',
    },
    resolvedAt: {
      type: Date,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Incident', incidentSchema);
