import express from 'express';
import {
  getCommunityPosts,
  createPost,
  getMyPosts,
  toggleLike,
  getCommunityPostById,
} from '../controllers/communityController.js';
import { protect } from '../middleware/auth.js';
import { uploadSingle } from '../middleware/upload.js';

const router = express.Router();

router.get('/', getCommunityPosts);
// User-specific routes should be declared before parameterized routes
router.get('/my-posts', protect, getMyPosts);
router.get('/:id', getCommunityPostById);
router.post('/', protect, uploadSingle('file'), createPost);
router.put('/:id/like', protect, toggleLike);

export default router;

