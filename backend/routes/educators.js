const express = require('express');
const router = express.Router();
const { auth, roleAuth } = require('../middleware/auth');
const {
  getProfile,
  updateProfile,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  getQuestions,
  createExam,
  createExamGroup,
  updateExam,
  deleteExam,
  getExams,
  getStudentPerformance,
  generateReport,
  getStudents,
  recollectExam,
  getPasswordResets,
  approvePasswordReset
} = require('../controllers/educatorController');

router.use(auth);
router.use(roleAuth(['educator']));

router.get('/students', getStudents);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.post('/questions', createQuestion);
router.put('/questions/:id', updateQuestion);
router.delete('/questions/:id', deleteQuestion);
router.get('/questions', getQuestions);
router.post('/exams', createExam);
router.post('/exams/group', createExamGroup);
router.put('/exams/:id', updateExam);
router.delete('/exams/:id', deleteExam);
router.get('/exams', getExams);
router.get('/performance', getStudentPerformance);
router.get('/reports', generateReport);
router.delete('/exams/:examId/recollect/:studentId', recollectExam);
router.get('/password-resets', getPasswordResets);
router.post('/password-resets/:id/reset', approvePasswordReset);

module.exports = router;