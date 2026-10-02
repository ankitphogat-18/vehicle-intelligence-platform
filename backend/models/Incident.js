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
  },
  { timestamps: true }
);

module.exports = mongoose.model('Incident', incidentSchema);
