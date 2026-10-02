const mongoose = require('mongoose');

// VehicleSighting model – similar to Detection but includes additional optional fields
const vehicleSightingSchema = new mongoose.Schema(
  {
    cameraId: {
      type: String,
      required: [true, 'Camera ID is required'],
      trim: true,
      uppercase: true,
    },
    timestamp: {
      type: Date,
      required: [true, 'Timestamp is required'],
      default: Date.now,
    },
    plateNumber: {
      type: String,
      required: [true, 'Plate number is required'],
      trim: true,
      uppercase: true,
    },
    plateConfidence: {
      type: Number,
      required: [true, 'Plate confidence score is required'],
      min: 0,
      max: 1,
      default: 0.9,
    },
    vehicleType: {
      type: String,
      required: [true, 'Vehicle type is required'],
      enum: {
        values: [
          'SEDAN',
          'SUV',
          'HATCHBACK',
          'TRUCK',
          'BUS',
          'MOTORCYCLE',
          'AUTO_RICKSHAW',
        ],
        message: '{VALUE} is not a valid vehicle type',
      },
      default: 'SEDAN',
    },
    vehicleMake: {
      type: String,
      required: false,
      trim: true,
    },
    vehicleModel: {
      type: String,
      required: false,
      trim: true,
    },
    vehicleColor: {
      type: String,
      required: [true, 'Vehicle color is required'],
      trim: true,
    },
    direction: {
      type: String,
      trim: true,
      default: 'INBOUND',
    },
    speed: {
      type: Number,
      default: null,
    },
    sourceType: {
      type: String,
      enum: ['SIMULATED_FEED', 'SYNTHETIC_TEST', 'MANUAL_TEST'],
      default: 'SIMULATED_FEED',
    },
    lane: {
      type: Number,
      default: 1,
    },
    // optional geo location – future GIS integration
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: false,
      },
    },
  },
  { timestamps: true }
);

vehicleSightingSchema.index({ plateNumber: 1, timestamp: 1 });
vehicleSightingSchema.index({ cameraId: 1, timestamp: -1 });

module.exports = mongoose.model('VehicleSighting', vehicleSightingSchema);

