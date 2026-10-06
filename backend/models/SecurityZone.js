const mongoose = require('mongoose');

const SecurityZoneSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    reason: { type: String, default: 'Security Protocol' }, // e.g. VVIP Movement, BNSS Sec 163, Anti-Sabotage
    level: {
      type: String,
      enum: ['LEVEL_1_BUFFER', 'LEVEL_2_EXCLUSION'],
      default: 'LEVEL_2_EXCLUSION',
    },
    cameraIds: [{ type: String }], // Cameras enclosed in this zone
    coordinates: [[Number]], // [[lat, lng], [lat, lng], ...] polygon boundary
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    activatedBy: String,
    activatedAt: { type: Date, default: Date.now },
    deactivatedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('SecurityZone', SecurityZoneSchema);
