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
    const { title, description, material } = req.body;
    const userId = req.user._id;

    if (!title || !description || !material) {
      throw new BadRequestError('Title, description, and material are required');
    }

    const postData = {
      title,
      description,
      material,
      userId,
    };

    // Add image/video URLs if uploaded
    if (req.file) {
      // CloudinaryStorage stores the URL in req.file.path
      const fileUrl = req.file.path || req.file.secure_url;
      if (req.file.mimetype.startsWith('video/')) {
        postData.videoUrl = fileUrl;
      } else {
        postData.imageUrl = fileUrl;
      }
    }

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

