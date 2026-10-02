const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key_123';

/**
 * Middleware to authenticate requests using JWT Bearer token.
 */
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication token missing or invalid format'
      });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication token missing'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, role, iat, exp, ... }
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Invalid or expired token'
    });
  }
};

/**
 * Middleware to enforce role-based access control.
 * @param {string[]|string} allowedRoles - Array of roles or single role allowed
 */
const requireRole = (allowedRoles) => {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: `Access denied. Requires one of roles: [${roles.join(', ')}]`
      });
    }

    next();
  };
};

module.exports = {
  authenticate,
  requireRole
};
