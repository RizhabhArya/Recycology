import Project from '../models/Project.js';
import User from '../models/User.js';
import { NotFoundError } from '../utils/ApiError.js';
import { sendSuccess } from '../utils/ApiResponse.js';

export const saveProjectForUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const project = await Project.findById(id);
    if (!project) {
      throw new NotFoundError('Project not found');
    }

    const user = await User.findById(userId);
    if (!user.savedProjects.includes(id)) {
      user.savedProjects.push(id);
      await user.save();
    }

    sendSuccess(res, 'Project saved to your collection', { project });
  } catch (error) {
    next(error);
  }
};

export const getSavedProjectsForUser = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).populate('savedProjects');
    sendSuccess(res, 'Saved projects retrieved', { projects: user.savedProjects || [] });
  } catch (error) {
    next(error);
  }
};

export const getProjectById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const project = await Project.findById(id);
    if (!project) return sendSuccess(res, 'Project not found', { project: null });
    sendSuccess(res, 'Project retrieved', { project });
  } catch (error) {
    next(error);
  }
};

export const rankProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { value } = req.body; // expected 1-5
    const userId = req.user._id;

    const project = await Project.findById(id);
    if (!project) {
      throw new NotFoundError('Project not found');
    }

    // remove existing vote by user
    project.ranks = project.ranks.filter((r) => r.userId?.toString() !== userId.toString());
    // push new vote
    project.ranks.push({ userId, value });

    // compute average
    const total = project.ranks.reduce((s, r) => s + (r.value || 0), 0);
    project.rankScore = project.ranks.length ? total / project.ranks.length : 0;

    await project.save();

    sendSuccess(res, 'Project ranked', { rankScore: project.rankScore });
  } catch (error) {
    next(error);
  }
};
