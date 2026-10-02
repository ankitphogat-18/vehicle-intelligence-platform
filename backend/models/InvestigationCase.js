const mongoose = require('mongoose');

const investigationCaseSchema = new mongoose.Schema(
  {
    vehiclePlate: { type: String, required: true },
    title: { type: String, required: true },
    status: {
      type: String,
      enum: ['Open', 'Reviewing', 'Resolved'],
      default: 'Open',
    },
    notes: { type: String },
    evidence: [{ type: String }], // placeholder for future evidence URLs
    anomalyIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Anomaly' }],
    sightingIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'VehicleSighting' }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('InvestigationCase', investigationCaseSchema);

