import { ApiError } from '../utils/ApiError.js';

/**
 * Global Error Handler Middleware
 * Handles all errors and sends standardized error responses
 */
export const errorHandler = (err, req, res, next) => {
  let error = err;

  // If error is not an instance of ApiError, convert it
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal Server Error';
    error = new ApiError(statusCode, message, false, err.stack);
  }

  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', {
      statusCode: error.statusCode,
      message: error.message,
      stack: error.stack,
      path: req.path,
      method: req.method
    });
  }

  // Send error response
  const response = {
    success: false,
    statusCode: error.statusCode,
    message: error.message,
    timestamp: new Date().toISOString()
  };

  // Include validation errors if present
  if (error.errors && Array.isArray(error.errors)) {
    response.errors = error.errors;
  }

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development' && error.stack) {
    response.stack = error.stack;
  }

  res.status(error.statusCode).json(response);
};

/**
 * 404 Not Found Handler
 */
export const notFoundHandler = (req, res, next) => {
  const error = new ApiError(404, `Route ${req.originalUrl} not found`);
  next(error);
};

