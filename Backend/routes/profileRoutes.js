import express from 'express';
import { getProfile, updateProfile, changePassword } from '../controllers/profileController.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../utils/response.js';

const router = express.Router();
router.use(authenticate);

router.get('/', asyncHandler(getProfile));
router.put('/', asyncHandler(updateProfile));
router.put('/password', asyncHandler(changePassword));

export default router;
