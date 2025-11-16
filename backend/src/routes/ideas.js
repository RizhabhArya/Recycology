import express from 'express';
import {
  generateProductIdea,
  getIdeasByMaterial,
  saveIdea,
  getSavedIdeas,
} from '../controllers/ideaController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', getIdeasByMaterial);
router.post('/generate', protect, generateProductIdea);
router.get('/saved', protect, getSavedIdeas);
router.post('/:id/save', protect, saveIdea);

export default router;

