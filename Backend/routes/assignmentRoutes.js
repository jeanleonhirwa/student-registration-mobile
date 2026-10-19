import express from 'express';
import {
  listAssignments,
  upcomingAssignments,
  getAssignment,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  submitAssignment,
} from '../controllers/assignmentController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { uploadSingle } from '../middleware/upload.js';
import { asyncHandler } from '../utils/response.js';

const router = express.Router();
router.use(authenticate);

router.get('/', asyncHandler(listAssignments));
router.get('/upcoming', authorize('student'), asyncHandler(upcomingAssignments)); // before /:id
router.get('/:id', asyncHandler(getAssignment));
router.post('/', authorize('teacher'), uploadSingle, asyncHandler(createAssignment));
router.put('/:id', authorize('teacher'), uploadSingle, asyncHandler(updateAssignment));
router.delete('/:id', authorize('teacher'), asyncHandler(deleteAssignment));
router.post('/:id/submit', authorize('student'), uploadSingle, asyncHandler(submitAssignment));

export default router;
