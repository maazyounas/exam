const express = require('express');
const { auth, roleAuth } = require('../middleware/auth');
const { getAnalyticsDashboard, exportReport } = require('../controllers/reportingController');

const router = express.Router();

// Get Analytics Dashboard
router.get('/analytics', auth, roleAuth(['educator']), getAnalyticsDashboard);

// Export Report
router.get('/export/:examId', auth, roleAuth(['educator']), exportReport);

module.exports = router;
