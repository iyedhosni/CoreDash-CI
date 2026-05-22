const express = require('express');
const router = express.Router();
const { getGrafanaUrl } = require('../controllers/grafanaController');

// @route   GET /api/grafana/url
// @desc    Get Grafana base URL from environment variables
// @access  Public
router.get('/url', getGrafanaUrl);

module.exports = router;
