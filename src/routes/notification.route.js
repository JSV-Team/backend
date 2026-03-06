const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');

// Get all notifications for a user
router.get('/', notificationController.getNotifications);

// Get unread notifications count
router.get('/unread/count', notificationController.getUnreadCount);

// Mark notification as read
router.post('/:id/read', notificationController.markAsRead);

// Mark all notifications as read
router.post('/read-all', notificationController.markAllAsRead);

// Delete notification
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;
