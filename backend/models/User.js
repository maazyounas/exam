const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'educator', 'admin'], required: true },
  // Student specific
  studentId: { 
    type: String, 
    sparse: true, 
    unique: true,
    validate: {
      validator: function(v) {
        return !v || /^\d{5}$/.test(v);
      },
      message: props => `Student ID must be exactly 5 digits.`
    }
  },
  course: { type: String },
  // Educator specific
  department: { type: String },
  // Common
  profilePicture: { type: String },
  createdAt: { type: Date, default: Date.now },
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);