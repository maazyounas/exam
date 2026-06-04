const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // null = broadcast to all
  title: { type: String, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false }, // for individual
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // for broadcast
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', NotificationSchema);
