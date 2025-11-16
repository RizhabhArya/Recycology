import GarbageCollector from '../models/GarbageCollector.js';
import { sendSuccess } from '../utils/ApiResponse.js';

/**
 * Get garbage collectors
 * Supports location-based filtering
 */
export const getCollectors = async (req, res, next) => {
  try {
    const { latitude, longitude, radius = 5000 } = req.query;

    let query = {};

    // If location provided, use geospatial query
    if (latitude && longitude) {
      query.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)],
          },
          $maxDistance: parseInt(radius), // in meters
        },
      };
    }

    const collectors = await GarbageCollector.find(query).limit(50);

    sendSuccess(res, 'Collectors retrieved successfully', { collectors });
  } catch (error) {
    next(error);
  }
};

