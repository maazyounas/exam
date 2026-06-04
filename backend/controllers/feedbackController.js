const Feedback = require('../models/Feedback');
const Joi = require('joi');

// Validation schema
const feedbackSchema = Joi.object({
  examId: Joi.string().required(),
  rating: Joi.number().min(1).max(5).required(),
  comments: Joi.string().allow('')
});

// @desc   Submit feedback (student)
// @route  POST /api/feedback
// @access Private (student)
exports.submitFeedback = async (req, res) => {
  try {
    const { error, value } = feedbackSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const feedback = new Feedback({
      examId: value.examId,
      studentId: req.user.id,
      rating: value.rating,
      comments: value.comments
    });
    await feedback.save();
    res.status(201).json({ message: 'Feedback submitted', feedback });
  } catch (err) {
    console.error('submitFeedback error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc   Get feedback for an exam (educator)
// @route  GET /api/feedback/:examId
// @access Private (educator)
exports.getFeedbackByExam = async (req, res) => {
  try {
    const { examId } = req.params;
    const feedbacks = await Feedback.find({ examId }).populate('studentId', 'name email');
    res.json({ count: feedbacks.length, feedbacks });
  } catch (err) {
    console.error('getFeedbackByExam error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
