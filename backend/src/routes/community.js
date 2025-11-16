import express from 'express';
import {
  getCommunityPosts,
  createPost,
  getMyPosts,
  toggleLike,
} from '../controllers/communityController.js';
import { protect } from '../middleware/auth.js';
import { uploadSingle } from '../middleware/upload.js';

const router = express.Router();

router.get('/', getCommunityPosts);
router.post('/', protect, uploadSingle('file'), createPost);
router.get('/my-posts', protect, getMyPosts);
router.put('/:id/like', protect, toggleLike);

export default router;

