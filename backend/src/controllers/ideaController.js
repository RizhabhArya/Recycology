import ProductIdea from '../models/ProductIdea.js';
import User from '../models/User.js';
import { NotFoundError, BadRequestError } from '../utils/ApiError.js';
import { sendSuccess, sendCreated } from '../utils/ApiResponse.js';
import { generateIdea } from '../services/aiService.js';

/**
 * Generate product idea
 */
export const generateProductIdea = async (req, res, next) => {
  try {
    const { material } = req.body;

    if (!material) {
      throw new BadRequestError('Material is required');
    }

    // Generate idea using AI service
    const ideaText = generateIdea(material);

    // Create idea document
    const idea = await ProductIdea.create({
      material,
      idea: ideaText,
      description: `Creative upcycling idea for ${material}`,
      userId: req.user?._id || null,
    });

    sendCreated(res, 'Idea generated successfully', { idea });
  } catch (error) {
    next(error);
  }
};

/**
 * Get ideas by material
 */
export const getIdeasByMaterial = async (req, res, next) => {
  try {
    const { material } = req.query;

    const query = {};
    if (material) {
      query.material = { $regex: material, $options: 'i' };
    }

    const ideas = await ProductIdea.find(query)
      .sort({ createdAt: -1 })
      .limit(20);

    sendSuccess(res, 'Ideas retrieved successfully', { ideas });
  } catch (error) {
    next(error);
  }
};

/**
 * Save idea to user's collection
 */
export const saveIdea = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Check if idea exists
    const idea = await ProductIdea.findById(id);
    if (!idea) {
      throw new NotFoundError('Idea not found');
    }

    // Add to user's saved ideas if not already saved
    const user = await User.findById(userId);
    if (!user.savedIdeas.includes(id)) {
      user.savedIdeas.push(id);
      await user.save();
    }

    sendSuccess(res, 'Idea saved successfully', { idea });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's saved ideas
 */
export const getSavedIdeas = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).populate('savedIdeas');
    
    sendSuccess(res, 'Saved ideas retrieved successfully', {
      ideas: user.savedIdeas,
    });
  } catch (error) {
    next(error);
  }
};

