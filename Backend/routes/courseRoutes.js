import express from 'express';
import {
  listCourses,
  listCategories,
  getCourse,
  enroll,
  unenroll,
} from '../controllers/courseController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { asyncHandler } from '../utils/response.js';

const router = express.Router();
router.use(authenticate);

router.get('/', asyncHandler(listCourses));
router.get('/categories', asyncHandler(listCategories)); // before /:id
router.get('/:id', asyncHandler(getCourse));
router.post('/:id/enroll', authorize('student'), asyncHandler(enroll));
router.delete('/:id/enroll', authorize('student'), asyncHandler(unenroll));

export default router;
