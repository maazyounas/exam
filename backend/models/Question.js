const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  questionText: { type: String, required: true },
  subject: { type: String, default: '' },
  topic: { type: String, default: '' },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  options: [{ type: String }], // for multiple choice
  correctAnswer: { type: String, required: true },
  type: { type: String, enum: ['multiple-choice'], default: 'multiple-choice' },
  isReusable: { type: Boolean, default: true },
  educator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Question', questionSchema);