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
    rcDocumentUrl: {
      type: String,
    },
    verificationStatus: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
    },
    policeCaseStatus: {
      type: String,
      enum: [
        'NOT_REPORTED',
        'VERIFICATION_UNDER_REVIEW',
        'SEARCH_IN_PROGRESS',
        'PATROL_ALERTED',
        'VEHICLE_FOUND'
      ],
      default: 'NOT_REPORTED',
    },
    policeNotes: {
      type: String,
      default: 'Documents submitted for verification.',
    },
    statusTimeline: [
      {
        status: {
          type: String,
          required: true,
        },
        updatedAt: {
          type: Date,
          default: Date.now,
        },
        message: {
          type: String,
          required: true,
        },
      },
    ],
    chalaanHistory: [
      {
        chalaanId: { type: String },
        amount: { type: Number },
        reason: { type: String },
        date: { type: Date, default: Date.now },
        paid: { type: Boolean, default: false },
      },
    ],
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
