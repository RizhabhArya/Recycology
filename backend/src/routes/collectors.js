import express from 'express';
import { getCollectors } from '../controllers/collectorController.js';

const router = express.Router();

router.get('/', getCollectors);

export default router;

