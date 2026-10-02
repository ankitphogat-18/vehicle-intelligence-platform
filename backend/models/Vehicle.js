const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    plateNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      index: true,
    },
    makeModel: {
      type: String,
      required: true,
    },
    color: {
      type: String,
    },
    rcDocPath: {
      type: String,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isStolen: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Vehicle', vehicleSchema);
