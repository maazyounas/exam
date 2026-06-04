const express = require('express');
const { auth, roleAuth } = require('../middleware/auth');
const { submitFeedback, getFeedbackByExam } = require('../controllers/feedbackController');

const router = express.Router();

// Student submits feedback
router.post('/', auth, roleAuth(['student']), submitFeedback);

// Educator retrieves feedback for an exam
router.get('/:examId', auth, roleAuth(['educator']), getFeedbackByExam);

module.exports = router;
