const mongoose = require('mongoose');

const cameraSchema = new mongoose.Schema(
  {
    cameraId: {
      type: String,
      required: [true, 'Camera ID is required'],
      unique: true,
      trim: true,
      uppercase: true
    },
    name: {
      type: String,
      required: [true, 'Camera name is required'],
      trim: true
    },
    type: {
      type: String,
      required: [true, 'Camera type is required'],
      enum: {
        values: [
          'ANPR',
          'CCTV_FIXED',
          'PTZ',
          'TRAFFIC',
          'SPEED_ENFORCEMENT',
          'TOLL_CHECKPOINT'
        ],
        message: '{VALUE} is not a valid camera type'
      },
      default: 'ANPR'
    },
    location: {
      type: String,
      required: [true, 'Location description is required'],
      trim: true
    },
    latitude: {
      type: Number,
      required: [true, 'Latitude is required'],
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      required: [true, 'Longitude is required'],
      min: -180,
      max: 180
    },
    junction: {
      type: String,
      required: [true, 'Junction or area identifier is required'],
      trim: true
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: ['ONLINE', 'OFFLINE', 'MAINTENANCE'],
        message: '{VALUE} is not a valid camera status'
      },
      default: 'ONLINE'
    },
    direction: {
      type: String,
      required: true,
      enum: {
        values: [
          'NORTH',
          'SOUTH',
          'EAST',
          'WEST',
          'INBOUND',
          'OUTBOUND',
          'BIDIRECTIONAL'
        ],
        message: '{VALUE} is not a valid direction'
      },
      default: 'INBOUND'
    },
    sourceType: {
      type: String,
      required: true,
      enum: {
        values: [
          'SIMULATED_VIDEO',
          'SYNTHETIC_FEED',
          'MOCK_RTSP',
          'STATIC_FRAME'
        ],
        message: '{VALUE} is not a valid source type'
      },
      default: 'SYNTHETIC_FEED'
    },
    streamUrl: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

const Camera = mongoose.model('Camera', cameraSchema);

module.exports = Camera;

