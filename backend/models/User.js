const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['CITIZEN', 'POLICE', 'INCIDENT_MANAGEMENT'],
      default: 'CITIZEN',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    phone: {
      type: String,
      default: '+91 98765 43210',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
