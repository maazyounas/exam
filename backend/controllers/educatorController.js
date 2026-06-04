const User = require('../models/User');
const Exam = require('../models/Exam');
const Question = require('../models/Question');
const Result = require('../models/Result');
const MonitoringSession = require('../models/MonitoringSession');
const PasswordResetRequest = require('../models/PasswordResetRequest');

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  const { name, department, profilePicture } = req.body;
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name, department, profilePicture },
      { new: true }
    ).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createQuestion = async (req, res) => {
  const { questionText, subject, topic, difficulty, options, correctAnswer, type, isReusable } = req.body;
  try {
    const question = new Question({
      questionText,
      subject,
      topic,
      difficulty,
      options,
      correctAnswer,
      type,
      isReusable: isReusable !== false,
      educator: req.user.id,
    });
    await question.save();
    res.status(201).json(question);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.getQuestions = async (req, res) => {
  try {
    const filter = {};
    if (req.query.subject) filter.subject = req.query.subject;
    if (req.query.topic) filter.topic = req.query.topic;
    if (req.query.difficulty) filter.difficulty = req.query.difficulty;

    // Each educator sees only their own questions (matches delete/update permissions).
    filter.educator = req.user.id;
    const questions = await Question.find(filter).sort({ createdAt: -1 });
    res.json(questions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createExam = async (req, res) => {
  const { title, description, questions, scheduledDate, duration, assignedCourses, assignedDepartments, rules, groupId, groupName, groupDescription, subject, randomAssign, assignCount } = req.body;
  try {
    const normalizedGroupId = typeof groupId === 'string' ? groupId.trim().toUpperCase() : '';

    if (!normalizedGroupId) {
      return res.status(400).json({ message: 'Exam Group ID is required.' });
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'Please select at least one question before creating the exam.' });
    }

    const exam = new Exam({
      title,
      groupId: normalizedGroupId,
      groupName,
      groupDescription,
      subject,
      description,
      questions,
      scheduledDate,
      duration,
      assignedCourses: assignedCourses || [],
      assignedDepartments: assignedDepartments || [],
      rules: {
        allowRetake: rules?.allowRetake || false,
        shuffleQuestions: rules?.shuffleQuestions || false,
        reviewAllowed: rules?.reviewAllowed !== false,
      },
      educator: req.user.id,
    });
    await exam.save();

    if (randomAssign && assignCount > 0) {
      const students = await User.find({ role: 'student' });
      if (students.length > 0) {
        const shuffled = students.sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, Math.min(assignCount, students.length));
        for (const student of selected) {
          if (!exam.enrolledStudents.includes(student._id)) {
            exam.enrolledStudents.push(student._id);
          }
        }
        await exam.save();
      }
    }

    res.status(201).json(exam);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.createExamGroup = async (req, res) => {
  const { groupId, groupName, groupDescription, exams } = req.body;
  try {
    if (!Array.isArray(exams) || exams.length === 0) {
      return res.status(400).json({ message: 'Please add at least one exam variant in the group.' });
    }

    const normalizedGroupId = typeof groupId === 'string' ? groupId.trim().toUpperCase() : '';
    const group = normalizedGroupId || `GRP-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const createdExams = [];

    for (const examData of exams) {
      if (!Array.isArray(examData.questions) || examData.questions.length === 0) {
        return res.status(400).json({ message: 'Each exam variant must include at least one question.' });
      }

      const exam = new Exam({
        title: examData.title || `Variant ${createdExams.length + 1}`,
        groupId: group,
        groupName,
        groupDescription,
        description: examData.description || '',
        questions: examData.questions,
        scheduledDate: examData.scheduledDate,
        duration: examData.duration,
        assignedCourses: examData.assignedCourses || [],
        assignedDepartments: examData.assignedDepartments || [],
        rules: {
          allowRetake: false,
          shuffleQuestions: false,
          reviewAllowed: true,
        },
        educator: req.user.id,
      });
      await exam.save();
      createdExams.push(exam);
    }

    res.status(201).json({ groupId: group, exams: createdExams });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.updateQuestion = async (req, res) => {
  const { questionText, subject, topic, difficulty, options, correctAnswer, type, isReusable } = req.body;
  try {
    const question = await Question.findById(req.params.id);
    if (!question) return res.status(404).json({ message: 'Question not found' });
    if (question.educator.toString() !== req.user.id) return res.status(403).json({ message: 'Unauthorized' });

    question.questionText = questionText;
    question.subject = subject;
    question.topic = topic;
    question.difficulty = difficulty;
    question.options = options;
    question.correctAnswer = correctAnswer;
    question.type = type;
    question.isReusable = isReusable !== false;

    await question.save();
    res.json(question);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deleteQuestion = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) return res.status(404).json({ message: 'Question not found' });
    if (question.educator.toString() !== String(req.user.id)) {
      return res.status(403).json({ message: 'You can only delete your own questions' });
    }
    await question.deleteOne();
    res.json({ message: 'Question deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateExam = async (req, res) => {
  const { title, description, questions, scheduledDate, duration, assignedCourses, assignedDepartments, rules } = req.body;
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    if (exam.educator.toString() !== req.user.id) return res.status(403).json({ message: 'Unauthorized' });

    exam.title = title;
    exam.description = description;
    exam.questions = questions;
    exam.scheduledDate = scheduledDate;
    exam.duration = duration;
    exam.assignedCourses = assignedCourses || [];
    exam.assignedDepartments = assignedDepartments || [];
    exam.rules = {
      allowRetake: rules?.allowRetake || false,
      shuffleQuestions: rules?.shuffleQuestions || false,
      reviewAllowed: rules?.reviewAllowed !== false,
    };

    await exam.save();
    res.json(exam);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deleteExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    if (exam.educator.toString() !== req.user.id) return res.status(403).json({ message: 'Unauthorized' });
    await exam.deleteOne();
    res.json({ message: 'Exam deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

exports.createBulkExams = async (req, res) => {
  const { exams = [], examCount = 5, randomAssign = true, assignCount = 10, randomAssignExamIndex } = req.body;
  try {
    const educatorQuestions = await Question.find({ educator: req.user.id });
    const sourceQuestions = educatorQuestions.map((q) => q._id);

    const getQuestionsForExam = (index) => {
      if (!sourceQuestions.length) return [];
      return Array.from({ length: 4 }, (_, i) => sourceQuestions[(index * 4 + i) % sourceQuestions.length]);
    };

    const count = exams.length > 0 ? exams.length : Math.max(1, parseInt(examCount, 10) || 5);
    const createExamData = exams.length > 0 ? exams : Array.from({ length: count }, (_, idx) => ({
      title: `Auto Exam ${idx + 1}`,
      description: `Generated exam ${idx + 1}`,
      questions: getQuestionsForExam(idx),
      scheduledDate: new Date(Date.now() + (idx + 1) * 24 * 60 * 60 * 1000),
      duration: 60,
      assignedCourses: [],
      assignedDepartments: [],
      rules: { allowRetake: false, shuffleQuestions: false, reviewAllowed: true },
    }));

    const createdExams = [];
    for (const examData of createExamData) {
      const examCode = `EX-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      const exam = new Exam({
        title: examData.title,
        examCode,
        description: examData.description,
        questions: examData.questions,
        scheduledDate: examData.scheduledDate,
        duration: examData.duration,
        assignedCourses: examData.assignedCourses || [],
        assignedDepartments: examData.assignedDepartments || [],
        rules: {
          allowRetake: examData.rules?.allowRetake || false,
          shuffleQuestions: examData.rules?.shuffleQuestions || false,
          reviewAllowed: examData.rules?.reviewAllowed !== false,
        },
        educator: req.user.id,
      });
      await exam.save();
      createdExams.push(exam);
    }

    if (randomAssign && createdExams.length > 0) {
      const assignIndex = typeof randomAssignExamIndex === 'number' ? randomAssignExamIndex : Math.floor(Math.random() * createdExams.length);
      const studentUsers = await User.find({ role: 'student' }).select('_id');
      const studentIds = shuffleArray(studentUsers.map((student) => student._id));
      const selectedStudents = studentIds.slice(0, Math.min(assignCount, studentIds.length));
      const assignedExam = createdExams[assignIndex];
      assignedExam.enrolledStudents = selectedStudents;
      await assignedExam.save();
    }

    res.status(201).json(createdExams);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.getExams = async (req, res) => {
  try {
    const exams = await Exam.find({ educator: req.user.id }).populate('questions');
    res.json(exams);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getStudentPerformance = async (req, res) => {
  try {
    const results = await Result.find({}).populate('student', 'name').populate('exam', 'title');
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.generateReport = async (req, res) => {
  // Detailed report: exam summary plus student results for each exam by this educator
  try {
    const exams = await Exam.find({ educator: req.user.id });
    const reports = [];

    for (const exam of exams) {
      const results = await Result.find({ exam: exam._id }).populate('student', 'name studentId');
      const totalStudents = results.length;
      const averageScore = totalStudents > 0
        ? results.reduce((sum, r) => sum + (r.percentage || 0), 0) / totalStudents
        : 0;

      const sessions = await MonitoringSession.find({ exam: exam._id });
      const sessionMap = {};
      sessions.forEach(s => {
        if (s.student) {
          sessionMap[s.student.toString()] = s;
        }
      });

      reports.push({
        examId: exam._id,
        examTitle: exam.title,
        averageScore,
        totalStudents,
        results: results.map((result) => {
          const session = result.student ? sessionMap[result.student._id.toString()] : null;
          return {
            resultId: result._id,
            studentId: result.student?.studentId || result.student?._id || null,
            studentMongoId: result.student?._id || null,
            studentName: result.student?.name || 'Unknown',
            score: result.score,
            totalQuestions: result.totalQuestions,
            percentage: result.percentage,
            submittedAt: result.submittedAt,
            totalViolations: session ? session.totalViolations : 0,
            monitoringStatus: session ? session.status : 'none'
          };
        }),
      });
    }

    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.recollectExam = async (req, res) => {
  const { examId, studentId } = req.params;
  try {
    // Verify that the exam belongs to the educator
    const exam = await Exam.findOne({ _id: examId, educator: req.user.id });
    if (!exam) {
      return res.status(403).json({ message: 'Not authorized to manage this exam' });
    }

    // Delete the Result document
    const resultDelete = await Result.deleteOne({ exam: examId, student: studentId });

    // Delete the MonitoringSession document
    const monitoringDelete = await MonitoringSession.deleteOne({ exam: examId, student: studentId });

    res.json({
      message: 'Exam recollected successfully. Student can retake the exam.',
      resultDeleted: resultDelete.deletedCount > 0,
      monitoringDeleted: monitoringDelete.deletedCount > 0
    });
  } catch (err) {
    console.error('recollectExam error:', err);
    res.status(500).json({ message: err.message });
  }
};

exports.getStudents = async (req, res) => {
  try {
    const students = await User.find({ role: 'student' }).select('name email studentId');
    console.log('getStudents hit, found:', students.length);
    res.json(students);
  } catch (err) {
    console.error('getStudents error:', err);
    res.status(500).json({ message: err.message });
  }
};

exports.getPasswordResets = async (req, res) => {
  try {
    const requests = await PasswordResetRequest.find({ status: 'pending' }).populate('studentId', 'name studentId email');
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.approvePasswordReset = async (req, res) => {
  try {
    const resetReq = await PasswordResetRequest.findById(req.params.id);
    if (!resetReq) {
      return res.status(404).json({ message: 'Request not found' });
    }
    if (resetReq.status === 'resolved') {
      return res.status(400).json({ message: 'Request already resolved' });
    }

    const user = await User.findById(resetReq.studentId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.password = 'password';
    await user.save(); // pre('save') hook will hash this

    resetReq.status = 'resolved';
    await resetReq.save();

    res.json({ message: 'Password reset to "password" successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
