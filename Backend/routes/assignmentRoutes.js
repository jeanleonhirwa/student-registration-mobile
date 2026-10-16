const express = require('express');
const {
  listAssignments,
  upcomingAssignments,
  getAssignment,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  submitAssignment,
} = require('../controllers/assignmentController');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadSingle } = require('../middleware/upload');
const { asyncHandler } = require('../utils/response');

const router = express.Router();
router.use(authenticate);

router.get('/', asyncHandler(listAssignments));
router.get('/upcoming', authorize('student'), asyncHandler(upcomingAssignments)); // before /:id
router.get('/:id', asyncHandler(getAssignment));
router.post('/', authorize('teacher'), uploadSingle, asyncHandler(createAssignment));
router.put('/:id', authorize('teacher'), uploadSingle, asyncHandler(updateAssignment));
router.delete('/:id', authorize('teacher'), asyncHandler(deleteAssignment));
router.post('/:id/submit', authorize('student'), uploadSingle, asyncHandler(submitAssignment));

module.exports = router;
