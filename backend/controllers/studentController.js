const User = require('../models/User');
const Exam = require('../models/Exam');
const Result = require('../models/Result');
const MonitoringSession = require('../models/MonitoringSession');
const { isStudentEnrolled, toObjectId } = require('../utils/enrollment');

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  const { name, course, profilePicture } = req.body;
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name, course, profilePicture },
      { new: true }
    ).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getEnrolledExams = async (req, res) => {
  try {
    const student = await User.findById(req.user.id);
    const query = { $or: [{ enrolledStudents: toObjectId(req.user.id) }] };

    if (student.course) query.$or.push({ assignedCourses: student.course });
    if (student.department) query.$or.push({ assignedDepartments: student.department });

    const exams = await Exam.find(query).populate('educator', 'name');
    res.json(exams);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.joinExam = async (req, res) => {
  const { examCode } = req.body;
  try {
    const groupId = typeof examCode === 'string' ? examCode.trim().toUpperCase() : '';
    if (!groupId) {
      return res.status(400).json({ message: 'Group ID is required' });
    }

    const existingAssigned = await Exam.findOne({ groupId, enrolledStudents: toObjectId(req.user.id) });
    if (existingAssigned) {
      return res.json(existingAssigned);
    }

    const exams = await Exam.find({ groupId });
    if (!exams.length) {
      return res.status(404).json({ message: 'Exam group not found with that code' });
    }

    const selected = exams[Math.floor(Math.random() * exams.length)];
    selected.enrolledStudents.push(toObjectId(req.user.id));
    await selected.save();
    res.json(selected);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getResults = async (req, res) => {
  try {
    const results = await Result.find({ student: req.user.id })
      .populate('exam', 'title scheduledDate')
      .populate({
        path: 'answers.question',
        select: 'questionText options correctAnswer'
      });
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getExamForTaking = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id).populate('questions');
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    if (!isStudentEnrolled(exam.enrolledStudents, req.user.id)) {
      return res.status(403).json({ message: 'Not enrolled in this exam' });
    }

    // Check if exam is scheduled
    const now = new Date();
    const scheduled = new Date(exam.scheduledDate);
    if (now < scheduled) {
      return res.status(400).json({ message: 'Exam not yet started' });
    }

    // Check if student has already taken this exam
    const existingResult = await Result.findOne({ student: req.user.id, exam: req.params.id });
    if (existingResult) {
      return res.status(403).json({ message: 'You have already completed this exam' });
    }

    res.json(exam);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.submitExam = async (req, res) => {
  const { answers, timeTracker, cancelledDueToViolation } = req.body;
  try {
    const exam = await Exam.findById(req.params.id).populate('questions');
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    if (!isStudentEnrolled(exam.enrolledStudents, req.user.id)) {
      return res.status(403).json({ message: 'Not enrolled in this exam' });
    }

    // Check if student has already taken this exam
    const existingResult = await Result.findOne({ student: req.user.id, exam: req.params.id });
    if (existingResult) {
      return res.status(400).json({ message: 'You have already completed this exam' });
    }

    // Calculate score
    let score = 0;
    const totalQuestions = exam.questions.length;
    exam.questions.forEach(q => {
      if (answers && answers[q._id] === q.correctAnswer) {
        score++;
      }
    });

    const answerArray = Object.entries(answers || {}).map(([questionId, answer]) => ({
      question: questionId,
      answer,
      timeSpent: timeTracker && timeTracker[questionId] ? timeTracker[questionId] : 0
    }));

    // Save result
    const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
    const result = new Result({
      student: req.user.id,
      exam: req.params.id,
      answers: answerArray,
      score,
      totalQuestions,
      percentage,
      submittedAt: new Date(),
      cancelledDueToViolation: !!cancelledDueToViolation,
    });
    await result.save();

    // If cancelled due to violation, ensure any active proctoring session is updated
    if (cancelledDueToViolation) {
      try {
        const session = await MonitoringSession.findOne({
          student: req.user.id,
          exam: req.params.id,
        }).sort({ startTime: -1 });
        if (session) {
          session.status = 'flagged';
          if (!session.endTime) {
            session.endTime = new Date();
          }
          await session.save();
        }
      } catch (monErr) {
        console.error('Failed to flag proctoring session during violation submit:', monErr);
      }
    }

    res.json({ message: 'Exam submitted', score, totalQuestions, percentage });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
