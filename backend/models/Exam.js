const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
  title: { type: String, required: true },
  groupId: { type: String, required: true, index: true },
  groupName: { type: String },
  groupDescription: { type: String },
  subject: { type: String },
  description: { type: String },
  educator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
  scheduledDate: { type: Date, required: true },
  duration: { type: Number, required: true }, // in minutes
  assignedCourses: [{ type: String }],
  assignedDepartments: [{ type: String }],
  rules: {
    allowRetake: { type: Boolean, default: false },
    shuffleQuestions: { type: Boolean, default: false },
    reviewAllowed: { type: Boolean, default: true },
  },
  enrolledStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  status: { type: String, enum: ['scheduled', 'ongoing', 'completed'], default: 'scheduled' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Exam', examSchema);