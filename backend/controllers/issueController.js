const Issue = require('../models/Issue');
const upload = require('../utils/upload');
const Joi = require('joi');
const path = require('path');

// Validation schema for issue (excluding file)
const issueSchema = Joi.object({
  examId: Joi.string().required(),
  category: Joi.string().valid('Technical', 'Content', 'Accessibility', 'Other').required(),
  description: Joi.string().required()
});

// @desc   Submit issue report (student)
// @route  POST /api/issues (multipart/form-data)
// @access Private (student)
exports.submitIssue = [
  upload.single('screenshot'), // field name 'screenshot'
  async (req, res) => {
    try {
      // Validate non-file fields
      const { error, value } = issueSchema.validate(req.body);
      if (error) return res.status(400).json({ message: error.details[0].message });

      const screenshotUrl = req.file ? `/uploads/${req.file.filename}` : undefined;

      const issue = new Issue({
        examId: value.examId,
        studentId: req.user.id,
        category: value.category,
        description: value.description,
        screenshotUrl
      });
      await issue.save();
      res.status(201).json({ message: 'Issue reported', issue });
    } catch (err) {
      console.error('submitIssue error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
];

// @desc   Get issues for an exam (educator)
// @route  GET /api/issues/:examId
// @access Private (educator)
exports.getIssuesByExam = async (req, res) => {
  try {
    const { examId } = req.params;
    const issues = await Issue.find({ examId }).populate('studentId', 'name email');
    res.json({ count: issues.length, issues });
  } catch (err) {
    console.error('getIssuesByExam error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc   Update issue status (educator)
// @route  PATCH /api/issues/:id
// @access Private (educator)
exports.updateIssueStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['Open', 'In Progress', 'Resolved'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }
    const issue = await Issue.findByIdAndUpdate(id, { status, updatedAt: Date.now() }, { new: true });
    if (!issue) return res.status(404).json({ message: 'Issue not found' });
    res.json({ message: 'Issue status updated', issue });
  } catch (err) {
    console.error('updateIssueStatus error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
