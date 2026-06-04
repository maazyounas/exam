const Notification = require('../models/Notification');
const User = require('../models/User');

// @desc   Create a notification (Educator)
// @route  POST /api/notifications
// @access Private (Educator)
exports.createNotification = async (req, res) => {
  try {
    const { recipientId, title, message } = req.body;
    const senderId = req.user.id;

    const notification = new Notification({
      senderId,
      recipientId: recipientId || null,
      title,
      message
    });

    await notification.save();
    res.status(201).json(notification);
  } catch (err) {
    console.error('Create notification error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc   Get sent notifications (Educator)
// @route  GET /api/notifications/sent
// @access Private (Educator)
exports.getSentNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ senderId: req.user.id })
      .populate('recipientId', 'name email studentId')
      .sort({ createdAt: -1 });
    res.json(notifications);
  } catch (err) {
    console.error('Get sent notifications error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc   Get notifications for a student
// @route  GET /api/notifications/student
// @access Private (Student)
exports.getStudentNotifications = async (req, res) => {
  try {
    const studentId = req.user.id;
    // Get direct messages and broadcasts
    const notifications = await Notification.find({
      $or: [
        { recipientId: studentId },
        { recipientId: null }
      ]
    })
    .populate('senderId', 'name department')
    .sort({ createdAt: -1 });

    res.json(notifications);
  } catch (err) {
    console.error('Get student notifications error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc   Mark notification as read (Student)
// @route  PATCH /api/notifications/:id/read
// @access Private (Student)
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const studentId = req.user.id;

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (notification.recipientId) {
      // Direct message
      if (notification.recipientId.toString() !== studentId) {
        return res.status(403).json({ message: 'Unauthorized' });
      }
      notification.isRead = true;
    } else {
      // Broadcast
      if (!notification.readBy.includes(studentId)) {
        notification.readBy.push(studentId);
      }
    }

    await notification.save();
    res.json({ message: 'Notification marked as read', notification });
  } catch (err) {
    console.error('Mark as read error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc   Delete a notification (Educator)
// @route  DELETE /api/notifications/:id
// @access Private (Educator)
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findById(id);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (notification.senderId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this notification' });
    }

    await notification.deleteOne();
    res.json({ message: 'Notification deleted successfully' });
  } catch (err) {
    console.error('Delete notification error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
