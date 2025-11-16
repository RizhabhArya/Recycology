import Campaign from '../models/Campaign.js';
import { sendSuccess } from '../utils/ApiResponse.js';

/**
 * Get all campaigns
 */
export const getCampaigns = async (req, res, next) => {
  try {
    const campaigns = await Campaign.find()
      .sort({ date: 1 })
      .limit(20);

    sendSuccess(res, 'Campaigns retrieved successfully', { campaigns });
  } catch (error) {
    next(error);
  }
};

