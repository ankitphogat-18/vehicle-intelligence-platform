// --- DNS FIX FOR MONGODB ATLAS SHARD RESOLUTION ---
const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '8.8.4.4']);
// --------------------------------------------------

require('dotenv/config');

const express = require('express');
const cors = require('cors');
const connect = require('./config/db');

const cameraRoutes = require('./routes/cameraRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const anprRoutes = require('./routes/anprRoutes');
const detectionRoutes = require('./routes/detectionRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const alertRoutes = require('./routes/alertRoutes');
const investigationRoutes = require('./routes/investigationRoutes');
const trafficAnalyticsRoutes = require('./routes/trafficAnalyticsRoutes');
const authRoutes = require('./routes/authRoutes');
const policeRoutes = require('./routes/policeRoutes');
const incidentRoutes = require('./routes/incidentRoutes');
const sightingRoutes = require('./routes/sightingRoutes');
const path = require('path');
const os = require('os');
const QRCode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connect();

app.use(cors());
app.use(express.json());

// Helper to get local network IP for mobile connections
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const devName in interfaces) {
    const iface = interfaces[devName];
    for (let i = 0; i < iface.length; i++) {
      const alias = iface[i];
      if (alias.family === 'IPv4' && !alias.internal && alias.address !== '127.0.0.1') {
        return alias.address;
      }
    }
  }
  return 'localhost';
}

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Vehicle Intelligence System Backend'
  });
});

// Mobile QR Code Generator Endpoint
app.get('/api/mobile-qr', async (req, res) => {
  try {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const localIp = getLocalIpAddress();
    const port = PORT;

    // Determine best host for mobile phone to connect to
    let host = req.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      host = localIp;
    }

    const mobileUrl = `${protocol}://${host}:${port}/mobile.html`;
    const qrImage = await QRCode.toDataURL(mobileUrl, {
      errorCorrectionLevel: 'M',
      margin: 2,
      scale: 8,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });

    res.json({
      success: true,
      url: mobileUrl,
      qrImage,
      localIp,
      port
    });
  } catch (err) {
    console.error('[QR Generation Error]:', err);
    res.status(500).json({
      success: false,
      error: 'QRGenerationError',
      message: 'Failed to generate mobile QR code'
    });
  }
});

// API Routes
app.use('/api/cameras', cameraRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/anpr', anprRoutes);
app.use('/api/detections', detectionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/investigations', investigationRoutes);
app.use('/api/analytics', trafficAnalyticsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/police', policeRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/sightings', sightingRoutes);

// Serve Public and Uploads
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[API Error]:', err.stack || err.message);
  res.status(err.status || 500).json({
    success: false,
    error: err.name || 'InternalServerError',
    message: err.message || 'An unexpected server error occurred'
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});