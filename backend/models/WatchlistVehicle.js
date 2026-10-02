const mongoose = require('mongoose');

const watchlistVehicleSchema = new mongoose.Schema(
  {
    plate: { type: String, required: true, uppercase: true, trim: true },
    reason: { type: String, required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('WatchlistVehicle', watchlistVehicleSchema);

