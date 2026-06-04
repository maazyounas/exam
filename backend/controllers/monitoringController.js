const MonitoringSession = require('../models/MonitoringSession');
const Exam = require('../models/Exam');
const User = require('../models/User');

// Start monitoring session
exports.startMonitoring = async (req, res) => {
  const { examId, location } = req.body;
  try {
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    // Check if already monitoring
    const existingSession = await MonitoringSession.findOne({
      student: req.user.id,
      exam: examId,
      status: 'active'
    });

    if (existingSession) {
      return res.json(existingSession);
    }

    const session = new MonitoringSession({
      student: req.user.id,
      exam: examId,
      initialLocation: location,
      status: 'active'
    });

    await session.save();
    res.json(session);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Log tab switch violation
exports.logTabSwitch = async (req, res) => {
  const { examId } = req.body;
  try {
    const session = await MonitoringSession.findOne({
      student: req.user.id,
      exam: examId,
      status: 'active'
    });

    if (!session) {
      return res.status(404).json({ message: 'Monitoring session not found' });
    }

    session.violations.push({
      type: 'tab_switch',
      timestamp: new Date(),
      details: { message: 'Student switched tabs' }
    });
    session.tabSwitches += 1;
    session.totalViolations += 1;

    // Flag if too many violations
    if (session.totalViolations > 5) {
      session.status = 'flagged';
    }

    await session.save();
    res.json({ success: true, totalViolations: session.totalViolations });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Log location change violation
exports.logLocationChange = async (req, res) => {
  const { examId, currentLocation, distance } = req.body;
  try {
    const session = await MonitoringSession.findOne({
      student: req.user.id,
      exam: examId,
      status: 'active'
    });

    if (!session) {
      return res.status(404).json({ message: 'Monitoring session not found' });
    }

    session.violations.push({
      type: 'location_change',
      timestamp: new Date(),
      details: {
        message: 'Student location changed',
        previousLocation: session.initialLocation,
        currentLocation,
        distance: `${distance.toFixed(2)} meters`
      }
    });
    session.locationChanges += 1;
    session.totalViolations += 1;

    if (session.totalViolations > 5) {
      session.status = 'flagged';
    }

    await session.save();
    res.json({ success: true, totalViolations: session.totalViolations });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Log screen blur/window blur violation
exports.logScreenBlur = async (req, res) => {
  const { examId } = req.body;
  try {
    const session = await MonitoringSession.findOne({
      student: req.user.id,
      exam: examId,
      status: 'active'
    });

    if (!session) {
      return res.status(404).json({ message: 'Monitoring session not found' });
    }

    session.violations.push({
      type: 'screen_blur',
      timestamp: new Date(),
      details: { message: 'Student window lost focus' }
    });
    session.screenBlurs += 1;
    session.totalViolations += 1;

    if (session.totalViolations > 5) {
      session.status = 'flagged';
    }

    await session.save();
    res.json({ success: true, totalViolations: session.totalViolations });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Log face absence violation
exports.logFaceAbsence = async (req, res) => {
  const { examId } = req.body;
  try {
    const session = await MonitoringSession.findOne({
      student: req.user.id,
      exam: examId,
      status: 'active'
    });

    if (!session) {
      return res.status(404).json({ message: 'Monitoring session not found' });
    }

    session.violations.push({
      type: 'face_absence',
      timestamp: new Date(),
      details: { message: 'Student face not detected' }
    });
    
    // faceAbsences might be undefined if old document, so fallback to 0
    session.faceAbsences = (session.faceAbsences || 0) + 1;
    session.totalViolations += 1;

    if (session.totalViolations > 5) {
      session.status = 'flagged';
    }

    await session.save();
    res.json({ success: true, totalViolations: session.totalViolations });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// End monitoring session
exports.endMonitoring = async (req, res) => {
  const { examId } = req.body;
  try {
    const session = await MonitoringSession.findOne({
      student: req.user.id,
      exam: examId,
      status: 'active'
    });

    if (!session) {
      return res.status(404).json({ message: 'Monitoring session not found' });
    }

    session.endTime = new Date();
    session.status = 'completed';
    await session.save();

    res.json(session);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get monitoring data for an exam (educator view)
exports.getExamMonitoring = async (req, res) => {
  const { examId } = req.params;
  try {
    const sessions = await MonitoringSession.find({ exam: examId })
      .populate('student', 'name email')
      .sort({ startTime: -1 });

    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get specific student monitoring session
exports.getStudentMonitoring = async (req, res) => {
  const { examId, studentId } = req.params;
  try {
    const session = await MonitoringSession.findOne({
      student: studentId,
      exam: examId
    }).populate('student', 'name email');

    if (!session) {
      return res.status(404).json({ message: 'Monitoring session not found' });
    }

    res.json(session);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
