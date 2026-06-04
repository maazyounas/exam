const express = require('express');
const router = express.Router();
const { auth, roleAuth } = require('../middleware/auth');
const {
  getProfile,
  updateProfile,
  getEnrolledExams,
  joinExam,
  getExamForTaking,
  submitExam,
  getResults
} = require('../controllers/studentController');

router.use(auth);
router.use(roleAuth(['student']));

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.get('/exams', getEnrolledExams);
router.post('/join', joinExam);
router.get('/exam/:id', getExamForTaking);
router.post('/submit/:id', submitExam);
router.get('/results', getResults);

module.exports = router;