const express = require('express');
const { getDashboard } = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../utils/response');

const router = express.Router();

router.get('/', authenticate, asyncHandler(getDashboard));

module.exports = router;
