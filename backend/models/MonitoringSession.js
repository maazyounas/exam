const mongoose = require('mongoose');

const monitoringSessionSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  exam: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date },
  initialLocation: {
    latitude: { type: Number },
    longitude: { type: Number },
    accuracy: { type: Number }
  },
  violations: [
    {
      type: { type: String, enum: ['tab_switch', 'location_change', 'screen_blur', 'inactivity', 'face_absence'], required: true },
      timestamp: { type: Date, default: Date.now },
      details: mongoose.Schema.Types.Mixed // flexible for storing any violation details
    }
  ],
  totalViolations: { type: Number, default: 0 },
  tabSwitches: { type: Number, default: 0 },
  locationChanges: { type: Number, default: 0 },
  screenBlurs: { type: Number, default: 0 },
  inactivityCount: { type: Number, default: 0 },
  faceAbsences: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'completed', 'flagged'], default: 'active' }
});

module.exports = mongoose.model('MonitoringSession', monitoringSessionSchema);
