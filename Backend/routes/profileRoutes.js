const express = require('express');
const { getProfile, updateProfile, changePassword } = require('../controllers/profileController');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../utils/response');

const router = express.Router();
router.use(authenticate);

router.get('/', asyncHandler(getProfile));
router.put('/', asyncHandler(updateProfile));
router.put('/password', asyncHandler(changePassword));

module.exports = router;
