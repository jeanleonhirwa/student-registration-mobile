const express = require('express');
const { register, login, me } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../utils/response');

const router = express.Router();

router.post('/register', asyncHandler(register));
router.post('/login', asyncHandler(login));
router.get('/me', authenticate, asyncHandler(me));

module.exports = router;
