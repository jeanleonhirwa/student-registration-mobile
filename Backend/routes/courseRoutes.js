const express = require('express');
const {
  listCourses,
  listCategories,
  getCourse,
  enroll,
  unenroll,
} = require('../controllers/courseController');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../utils/response');

const router = express.Router();
router.use(authenticate);

router.get('/', asyncHandler(listCourses));
router.get('/categories', asyncHandler(listCategories)); // before /:id
router.get('/:id', asyncHandler(getCourse));
router.post('/:id/enroll', authorize('student'), asyncHandler(enroll));
router.delete('/:id/enroll', authorize('student'), asyncHandler(unenroll));

module.exports = router;
