const mongoose = require('mongoose');

/** True if studentId is in enrolledStudents (handles string vs ObjectId). */
function isStudentEnrolled(enrolledStudents, studentId) {
  const id = String(studentId);
  return enrolledStudents.some((entry) => String(entry) === id);
}

/** Normalize for MongoDB queries that match enrolledStudents. */
function toObjectId(studentId) {
  return mongoose.Types.ObjectId.isValid(studentId)
    ? new mongoose.Types.ObjectId(studentId)
    : studentId;
}

module.exports = { isStudentEnrolled, toObjectId };
