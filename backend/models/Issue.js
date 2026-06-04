const mongoose = require('mongoose');

const IssueSchema = new mongoose.Schema({
  examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category: { type: String, enum: ['Technical','Content','Accessibility','Other'], required: true },
  description: { type: String, required: true },
  screenshotUrl: { type: String },
  status: { type: String, enum: ['Open','In Progress','Resolved'], default: 'Open' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Issue', IssueSchema);
