const express = require('express');
const router = express.Router();
const { register, login, getSettings, changePassword, forgotPassword } = require('../controllers/authController');
const { auth, roleAuth } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/settings', auth, roleAuth(['student', 'educator']), getSettings);
router.post('/change-password', auth, roleAuth(['student', 'educator']), changePassword);
router.post('/forgot-password', forgotPassword);

module.exports = router;
