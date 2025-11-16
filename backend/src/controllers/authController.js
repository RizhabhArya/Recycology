import User from '../models/User.js';
import { BadRequestError, UnauthorizedError, ConflictError } from '../utils/ApiError.js';
import { sendResponse, sendSuccess, sendCreated } from '../utils/ApiResponse.js';
import { generateToken } from '../utils/jwt.js';

/**
 * Register new user
 */
export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
    });

    // Generate token
    const token = generateToken(user._id);

    // Remove password from response
    const userData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
    };

    sendCreated(res, 'User registered successfully', {
      user: userData,
      token,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login user
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Check if user exists and get password
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Check password
    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Generate token
    const token = generateToken(user._id);

    // Remove password from response
    const userData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
    };

    sendSuccess(res, 'Login successful', {
      user: userData,
      token,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user
 */
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('savedIdeas')
      .populate('myPosts');

    sendSuccess(res, 'User retrieved successfully', { user });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user profile
 */
export const updateProfile = async (req, res, next) => {
  try {
    const { name, email } = req.body;
    const userId = req.user._id;

    // Check if email is being changed and if it's already taken
    if (email) {
      const existingUser = await User.findOne({ email, _id: { $ne: userId } });
      if (existingUser) {
        throw new ConflictError('Email already in use');
      }
    }

    // Update user
    const user = await User.findByIdAndUpdate(
      userId,
      { name, email },
      { new: true, runValidators: true }
    ).select('-password');

    sendSuccess(res, 'Profile updated successfully', { user });
  } catch (error) {
    next(error);
  }
};

