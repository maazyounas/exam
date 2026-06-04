const User = require('../models/User');
const PasswordResetRequest = require('../models/PasswordResetRequest');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
  const { name, email, password, role, studentId, course, department } = req.body;
  try {
    const normalizedRole = role === 'educator' ? 'educator' : 'student';
    const normalizedStudentId = normalizedRole === 'student' && typeof studentId === 'string'
      ? studentId.trim()
      : undefined;
    const normalizedCourse = normalizedRole === 'student' && typeof course === 'string'
      ? course.trim()
      : undefined;
    const normalizedDepartment = normalizedRole === 'educator' && typeof department === 'string'
      ? department.trim()
      : undefined;

    const user = new User({
      name,
      email,
      password,
      role: normalizedRole,
      studentId: normalizedStudentId || undefined,
      course: normalizedCourse || undefined,
      department: normalizedDepartment || undefined,
    });

    await user.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    if (err.code === 11000) {
      if (err.keyPattern?.studentId) return res.status(400).json({ message: 'This Student ID is already registered.' });
      if (err.keyPattern?.email) return res.status(400).json({ message: 'This email is already registered.' });
    }
    res.status(400).json({ message: err.message });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ message: 'Current password, new password, and confirm password are required.' });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: 'New password and confirm password do not match.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }

    if (await user.comparePassword(newPassword)) {
      return res.status(400).json({ message: 'New password must be different from the current password.' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Email is required.' });
  }

  try {
    const user = await User.findOne({ email, role: 'student' });
    if (!user) {
      return res.status(404).json({ message: 'No student found with that email address.' });
    }

    // Check if there's already a pending request
    const existingReq = await PasswordResetRequest.findOne({ studentId: user._id, status: 'pending' });
    if (existingReq) {
      return res.status(400).json({ message: 'A password reset request is already pending for this account.' });
    }

    const resetReq = new PasswordResetRequest({
      studentId: user._id,
      email: user.email
    });
    await resetReq.save();

    res.status(200).json({ message: 'Password reset request sent to educators successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
