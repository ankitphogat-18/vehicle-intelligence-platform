const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vehicle_intelligence';

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000 // Quick timeout so server startup is not blocked if MongoDB is offline
    });
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.warn(`[Database] Warning: MongoDB connection failed (${error.message}).`);
    console.warn(`[Database] The server will continue running in offline/initial development mode.`);
  }
};

module.exports = connectDB;

