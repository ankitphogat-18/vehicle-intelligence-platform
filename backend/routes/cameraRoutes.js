const express = require('express');
const router = express.Router();
const Camera = require('../models/Camera');

// GET /api/cameras - Retrieve all cameras with optional filtering
router.get('/', async (req, res, next) => {
  try {
    const { status, type, search } = req.query;
    const filter = {};

    if (status) {
      filter.status = status.toUpperCase();
    }

    if (type) {
      filter.type = type.toUpperCase();
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { junction: { $regex: search, $options: 'i' } },
        { cameraId: { $regex: search, $options: 'i' } }
      ];
    }

    const cameras = await Camera.find(filter).sort({ cameraId: 1 });
    
    // Group count stats
    const stats = {
      total: cameras.length,
      online: cameras.filter((c) => c.status === 'ONLINE').length,
      offline: cameras.filter((c) => c.status === 'OFFLINE').length,
      maintenance: cameras.filter((c) => c.status === 'MAINTENANCE').length,
      byType: {
        ANPR: cameras.filter((c) => c.type === 'ANPR').length,
        SPEED_ENFORCEMENT: cameras.filter((c) => c.type === 'SPEED_ENFORCEMENT').length,
        TOLL_CHECKPOINT: cameras.filter((c) => c.type === 'TOLL_CHECKPOINT').length,
        CCTV_FIXED: cameras.filter((c) => c.type === 'CCTV_FIXED').length,
        TRAFFIC: cameras.filter((c) => c.type === 'TRAFFIC').length,
        PTZ: cameras.filter((c) => c.type === 'PTZ').length
      }
    };

    res.json({
      success: true,
      count: cameras.length,
      stats,
      data: cameras
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/cameras/:id - Retrieve single camera by ID or cameraId string
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    let camera = null;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      camera = await Camera.findById(id);
    }

    if (!camera) {
      camera = await Camera.findOne({ cameraId: id.toUpperCase() });
    }

    if (!camera) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: `Camera with identifier '${id}' not found`
      });
    }

    res.json({
      success: true,
      data: camera
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/cameras - Create new camera
router.post('/', async (req, res, next) => {
  try {
    const newCamera = new Camera(req.body);
    const savedCamera = await newCamera.save();

    res.status(201).json({
      success: true,
      message: 'Camera registered successfully',
      data: savedCamera
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Duplicate Key Error',
        message: `Camera with ID '${req.body.cameraId}' already exists`
      });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: error.message
      });
    }
    next(error);
  }
});

// PUT /api/cameras/:id - Update existing camera
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const query = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { cameraId: id.toUpperCase() };

    const updatedCamera = await Camera.findOneAndUpdate(query, req.body, {
      new: true,
      runValidators: true
    });

    if (!updatedCamera) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: `Camera with identifier '${id}' not found`
      });
    }

    res.json({
      success: true,
      message: 'Camera updated successfully',
      data: updatedCamera
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: error.message
      });
    }
    next(error);
  }
});

// DELETE /api/cameras/:id - Remove camera
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const query = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { cameraId: id.toUpperCase() };

    const deletedCamera = await Camera.findOneAndDelete(query);

    if (!deletedCamera) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: `Camera with identifier '${id}' not found`
      });
    }

    res.json({
      success: true,
      message: `Camera '${deletedCamera.cameraId}' removed successfully`,
      data: deletedCamera
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

