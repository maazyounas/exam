const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  exam: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  answers: [{ question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' }, answer: String, timeSpent: { type: Number, default: 0 } }],
  score: { type: Number, required: true },
  totalQuestions: { type: Number, required: true },
  percentage: { type: Number, required: true },
  submittedAt: { type: Date, default: Date.now },
  cancelledDueToViolation: { type: Boolean, default: false },
});

module.exports = mongoose.model('Result', resultSchema);