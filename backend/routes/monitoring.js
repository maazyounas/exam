const express = require('express');
const router = express.Router();
const { auth, roleAuth } = require('../middleware/auth');
const {
  startMonitoring,
  logTabSwitch,
  logLocationChange,
  logScreenBlur,
  logFaceAbsence,
  endMonitoring,
  getExamMonitoring,
  getStudentMonitoring
} = require('../controllers/monitoringController');

// Student routes - log violations
router.post('/start', auth, roleAuth(['student']), startMonitoring);
router.post('/tab-switch', auth, roleAuth(['student']), logTabSwitch);
router.post('/location-change', auth, roleAuth(['student']), logLocationChange);
router.post('/screen-blur', auth, roleAuth(['student']), logScreenBlur);
router.post('/face-absence', auth, roleAuth(['student']), logFaceAbsence);
router.post('/end', auth, roleAuth(['student']), endMonitoring);

// Educator routes - view monitoring data
router.get('/exam/:examId', auth, roleAuth(['educator']), getExamMonitoring);
router.get('/exam/:examId/student/:studentId', auth, roleAuth(['educator']), getStudentMonitoring);

module.exports = router;
