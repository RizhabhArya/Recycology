import CommunityPost from '../models/CommunityPost.js';
import User from '../models/User.js';
import { NotFoundError, BadRequestError } from '../utils/ApiError.js';
import { sendSuccess, sendCreated } from '../utils/ApiResponse.js';

/**
 * Get all community posts
 */
export const getCommunityPosts = async (req, res, next) => {
  try {
    const posts = await CommunityPost.find()
      .populate('userId', 'name email avatar')
      .sort({ createdAt: -1 })
      .limit(20);

    sendSuccess(res, 'Community posts retrieved successfully', { posts });
  } catch (error) {
    next(error);
  }
};

/**
 * Create community post
 */
export const createPost = async (req, res, next) => {
  try {
    const {
      projectName,
      title,
      description,
      materials,
      steps,
      inputPrompt,
      videoUrl,
    } = req.body;
    const userId = req.user._id;

    if (!projectName || !description) {
      throw new BadRequestError('Project name and description are required');
    }

    // Normalize materials and steps when sent as JSON strings (multipart/form-data)
    let parsedMaterials = [];
    if (Array.isArray(materials)) {
      parsedMaterials = materials;
    } else if (typeof materials === 'string' && materials.trim()) {
      try {
        const m = JSON.parse(materials);
        if (Array.isArray(m)) parsedMaterials = m;
      } catch (e) {
        // Fallback: split by newlines or commas
        parsedMaterials = materials.split(/\r?\n|,/).map((s) => s.trim()).filter(Boolean).map((name) => ({ name }));
      }
    }

    let parsedSteps = [];
    if (Array.isArray(steps)) {
      parsedSteps = steps;
    } else if (typeof steps === 'string' && steps.trim()) {
      try {
        const s = JSON.parse(steps);
        if (Array.isArray(s)) parsedSteps = s;
      } catch (e) {
        // Fallback: treat each non-empty line as a simple step object
        parsedSteps = steps.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((t) => ({ title: t }));
      }
    }

    // Determine image or video URL from uploaded file (if any)
    let imageUrl = null;
    let finalVideoUrl = videoUrl || null;
    // Our Cloudinary storage returns `url` and `public_id` in req.file
    if (req.file && (req.file.url || req.file.path)) {
      const uploadedUrl = req.file.url || req.file.path;
      const mime = req.file.mimetype || '';
      if (mime.startsWith('image')) imageUrl = uploadedUrl;
      else finalVideoUrl = uploadedUrl;
    }

    const postData = {
      projectName,
      title: title || projectName,
      description,
      materials: parsedMaterials,
      steps: parsedSteps,
      inputPrompt: inputPrompt || '',
      videoUrl: finalVideoUrl,
      imageUrl: imageUrl,
      userId,
    };

    const post = await CommunityPost.create(postData);

    // Add to user's myPosts
    await User.findByIdAndUpdate(userId, {
      $push: { myPosts: post._id },
    });

    const populatedPost = await CommunityPost.findById(post._id)
      .populate('userId', 'name email avatar');

    sendCreated(res, 'Post created successfully', { post: populatedPost });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's own posts
 */
export const getMyPosts = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const posts = await CommunityPost.find({ userId })
      .populate('userId', 'name email avatar')
      .sort({ createdAt: -1 });

    sendSuccess(res, 'My posts retrieved successfully', { posts });
  } catch (error) {
    next(error);
  }
};

/**
 * Like/Unlike a post
 */
export const toggleLike = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const post = await CommunityPost.findById(id);
    if (!post) {
      throw new NotFoundError('Post not found');
    }

    const isLiked = post.likes.includes(userId);

    if (isLiked) {
      // Unlike
      post.likes = post.likes.filter(
        (likeId) => likeId.toString() !== userId.toString()
      );
    } else {
      // Like
      post.likes.push(userId);
    }

    await post.save();

    const populatedPost = await CommunityPost.findById(id)
      .populate('userId', 'name email avatar');

    sendSuccess(res, isLiked ? 'Post unliked' : 'Post liked', {
      post: populatedPost,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single community post by id
 */
export const getCommunityPostById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const post = await CommunityPost.findById(id).populate('userId', 'name email avatar');
    if (!post) {
      return sendSuccess(res, 'Post not found', { post: null });
    }
    sendSuccess(res, 'Post retrieved', { post });
  } catch (error) {
    next(error);
  }
};

