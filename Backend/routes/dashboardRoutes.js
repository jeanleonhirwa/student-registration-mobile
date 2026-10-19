import express from 'express';
import { getDashboard } from '../controllers/dashboardController.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../utils/response.js';

const router = express.Router();

router.get('/', authenticate, asyncHandler(getDashboard));

export default router;
