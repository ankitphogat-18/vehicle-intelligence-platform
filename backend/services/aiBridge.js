const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const AI_SERVICE_URL = 'http://127.0.0.1:8000';

async function detectPlatesFromVideo(videoPath) {
  try {
    console.log(`[AI Bridge] Processing video via Local AI Server (${AI_SERVICE_URL})...`);

    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video file does not exist at: ${videoPath}`);
    }

    const form = new FormData();
    form.append('file', fs.createReadStream(videoPath));

    const response = await axios.post(`${AI_SERVICE_URL}/predict-video`, form, {
      headers: form.getHeaders(),
      timeout: 300000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    console.log('[AI Bridge] AI Server returned sightings:', response.data);
    return Array.isArray(response.data) ? response.data : [];
  } catch (err) {
    console.error('[AI Bridge] AI Server error:', err.response?.data || err.message);
    return [];
  }
}

async function detectPlateFromImage(imagePath) {
  try {
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image file does not exist at: ${imagePath}`);
    }

    const form = new FormData();
    form.append('file', fs.createReadStream(imagePath));

    const response = await axios.post(`${AI_SERVICE_URL}/predict-image`, form, {
      headers: form.getHeaders(),
      timeout: 10000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    if (response.data && response.data.success !== undefined) {
      return response.data;
    }

    return {
      success: true,
      plateNumber: response.data.plateNumber || null,
      confidence: response.data.confidence || 0.0,
      cropImagePath: response.data.cropImagePath || null
    };
  } catch (err) {
    console.error('[AI Bridge Image Error]:', err.response?.data || err.message);
    // Return graceful structure so camera stream does not halt
    return {
      success: true,
      plateNumber: null,
      confidence: 0.0,
      cropImagePath: null,
      error: err.message
    };
  }
}

module.exports = {
  detectPlateFromImage,
  detectPlatesFromVideo
};
