/**
 * Standardized API Response Utility
 * Provides consistent response format across all endpoints
 */

export class ApiResponse {
  constructor(statusCode, message, data = null, success = true) {
    this.statusCode = statusCode;
    this.success = success;
    this.message = message;
    this.data = data;
    this.timestamp = new Date().toISOString();
  }

  // Static methods for common responses
  static success(statusCode = 200, message = 'Success', data = null) {
    return new ApiResponse(statusCode, message, data, true);
  }

  static created(message = 'Resource created successfully', data = null) {
    return new ApiResponse(201, message, data, true);
  }

  static noContent(message = 'No content') {
    return new ApiResponse(204, message, null, true);
  }

  // Helper method to send response
  static send(res, statusCode, message, data = null) {
    const response = new ApiResponse(statusCode, message, data, true);
    return res.status(statusCode).json(response);
  }

  // Paginated response
  static paginated(res, statusCode, message, data, pagination) {
    const response = {
      statusCode,
      success: true,
      message,
      data,
      pagination: {
        page: pagination.page || 1,
        limit: pagination.limit || 10,
        total: pagination.total || 0,
        pages: Math.ceil((pagination.total || 0) / (pagination.limit || 10))
      },
      timestamp: new Date().toISOString()
    };
    return res.status(statusCode).json(response);
  }
}

// Helper function for sending responses (shorter syntax)
export const sendResponse = (res, statusCode, message, data = null) => {
  return ApiResponse.send(res, statusCode, message, data);
};

export const sendCreated = (res, message, data = null) => {
  return ApiResponse.created(message, data);
};

export const sendSuccess = (res, message, data = null) => {
  return ApiResponse.success(200, message, data);
};

