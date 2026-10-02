const mongoose = require('mongoose');

const anomalySchema = new mongoose.Schema(
  {
    type: { type: String, required: true }, // e.g., 'ImpossibleTravel', 'WatchlistMatch', etc.
    description: { type: String, required: true },
    confidence: { type: Number, required: true, min: 0, max: 1 },
    status: {
      type: String,
      enum: ['Potential', 'Under Review', 'Dismissed'],
      default: 'Potential',
    },
    relatedSightingIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'VehicleSighting' }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Anomaly', anomalySchema);

