const mongoose = require('mongoose');

const cameraSchema = new mongoose.Schema(
  {
    cameraId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: true,
    },
    locationName: {
      type: String,
      required: true,
    },
    location: {
      type: String,
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
    type: {
      type: String,
      enum: ['ANPR', 'SPEED_ENFORCEMENT', 'TOLL_CHECKPOINT', 'CCTV_FIXED', 'TRAFFIC', 'PTZ'],
      default: 'ANPR',
    },
    status: {
      type: String,
      enum: ['ONLINE', 'OFFLINE', 'MAINTENANCE'],
      default: 'ONLINE',
    },
    isRestricted: {
      type: Boolean,
      default: false,
    },
    currentSecurityLevel: {
      type: String,
      enum: ['NORMAL', 'LEVEL_1_BUFFER', 'LEVEL_2_EXCLUSION'],
      default: 'NORMAL',
    },
    direction: {
      type: String,
      default: 'BIDIRECTIONAL',
    },
    sourceType: {
      type: String,
      default: 'LIVE_CCTV',
    },
    streamUrl: {
      type: String,
    },
    junction: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Camera', cameraSchema);
