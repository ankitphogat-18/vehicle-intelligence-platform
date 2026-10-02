const mongoose = require('mongoose');

const cameraSchema = new mongoose.Schema({
  cameraId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
  },
  locationName: {
    type: String,
    required: true,
  },
  latitude: {
    type: Number,
    required: true,
  },
  longitude: {
    type: Number,
    required: true,
  },
  sector: {
    type: String,
  },
});

module.exports = mongoose.model('Camera', cameraSchema);
