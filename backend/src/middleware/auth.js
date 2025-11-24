import { UnauthorizedError } from '../utils/ApiError.js';
import { verifyToken } from '../utils/jwt.js';
import User from '../models/User.js';

/**
 * Protect routes - Verify JWT token
 */
export const protect = async (req, res, next) => {
  try {
    let token;

    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new UnauthorizedError('Not authorized, no token provided');
    }

    try {
      // Verify token
      const decoded = verifyToken(token);
      
      // Get user from token
      req.user = await User.findById(decoded.userId).select('-password');
      
      if (!req.user) {
        throw new UnauthorizedError('User not found');
      }

      next();
    } catch (error) {
      throw new UnauthorizedError('Not authorized, token failed');
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Require admin user. Uses env var ADMIN_EMAIL or ADMIN_USERS (comma-separated)
 * Assumes `protect` ran earlier and set `req.user`.
 */
export const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Not authorized');
    }

    // Role-based check: user.role must be 'admin'
    if (!req.user.role || req.user.role !== 'admin') {
      throw new UnauthorizedError('Admin privileges required');
    }

    next();
  } catch (error) {
    next(error);
  }
};

