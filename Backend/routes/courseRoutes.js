import express from 'express';
import {
  listCourses,
  listCategories,
  getCourse,
  enroll,
  unenroll,
  createCourse,
  claimCourse,
  releaseCourse,
} from '../controllers/courseController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { asyncHandler } from '../utils/response.js';

const router = express.Router();
router.use(authenticate);

router.get('/', asyncHandler(listCourses));
router.get('/categories', asyncHandler(listCategories)); // before /:id
router.get('/:id', asyncHandler(getCourse));
router.post('/', authorize('teacher'), asyncHandler(createCourse));
router.post('/:id/claim', authorize('teacher'), asyncHandler(claimCourse));
router.delete('/:id/claim', authorize('teacher'), asyncHandler(releaseCourse));
router.post('/:id/enroll', authorize('student'), asyncHandler(enroll));
router.delete('/:id/enroll', authorize('student'), asyncHandler(unenroll));

export default router;
