const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const connectDB = require('./config/db');

const cameraRoutes = require('./routes/cameraRoutes');
const detectionRoutes = require('./routes/detectionRoutes');
const anprRoutes = require('./routes/anprRoutes');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB (non-blocking for offline development)
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root Route
app.get('/', (req, res) => {
  res.json({
    name: 'City-Wide Vehicle Intelligence & Investigation Platform API',
    version: '1.0.0',
    status: 'online',
    phase: 'Phase 3 - High-Precision OCR / ANPR Foundation',
    endpoints: {
      health: '/api/health',
      cameras: '/api/cameras',
      detections: '/api/detections',
      vehicleSightings: '/api/detections/vehicle/:plateNumber',
      anprRecognize: 'POST /api/anpr/recognize',
      anprLogObservation: 'POST /api/anpr/log-observation',
      anprSamples: '/api/anpr/test-samples'
    }
  });
});

// API Routes
app.use('/api/cameras', cameraRoutes);
app.use('/api/detections', detectionRoutes);
app.use('/api/anpr', anprRoutes);

// Health-Check Endpoint
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

  res.status(200).json({
    status: 'ok',
    message: 'Vehicle Intelligence Backend is operational',
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatus,
      readyState: mongoose.connection.readyState
    },
    environment: process.env.NODE_ENV || 'development'
  });
});

// 404 Route Handler
app.use((req, res, next) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Centralized Error Handler
app.use((err, req, res, next) => {
  console.error('[Server Error]:', err.stack || err);
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred'
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`[Server] Vehicle Intelligence API server running on port ${PORT}`);
  console.log(`[Server] Health check endpoint: http://localhost:${PORT}/api/health`);
});

