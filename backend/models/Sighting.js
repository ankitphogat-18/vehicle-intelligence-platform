const mongoose = require('mongoose');

const sightingSchema = new mongoose.Schema({
  plateNumber: {
    type: String,
    required: true,
    uppercase: true,
    index: true,
  },
  cameraId: {
    type: String,
    required: true,
    index: true,
  },
  locationName: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
  cropImagePath: {
    type: String,
  },
  confidence: {
    type: Number,
  },
});

module.exports = mongoose.model('Sighting', sightingSchema);
