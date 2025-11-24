import express from 'express';
import { saveProjectForUser, getSavedProjectsForUser, getProjectById, rankProject } from '../controllers/projectController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/:id/save', protect, saveProjectForUser);
router.get('/saved', protect, getSavedProjectsForUser);
router.get('/:id', getProjectById);
router.post('/:id/rank', protect, rankProject);

export default router;
