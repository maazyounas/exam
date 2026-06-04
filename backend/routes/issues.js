const express = require('express');
const { auth, roleAuth } = require('../middleware/auth');
const { submitIssue, getIssuesByExam, updateIssueStatus } = require('../controllers/issueController');

const router = express.Router();

// Student submits an issue
router.post('/', auth, roleAuth(['student']), submitIssue);

// Educator fetches issues for an exam
router.get('/:examId', auth, roleAuth(['educator']), getIssuesByExam);

// Educator updates issue status
router.patch('/:id', auth, roleAuth(['educator']), updateIssueStatus);

module.exports = router;
