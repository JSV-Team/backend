const notificationModel = require('../models/notification.model');

/**
 * Notification Service - Xử lý logic liên quan đến thông báo
 */

const getNotificationsByUserId = async (userId, limit = 50) => {
  return await notificationModel.getNotificationsByUserId(userId, limit);
};

const getUnreadCount = async (userId) => {
  return await notificationModel.getUnreadCount(userId);
};

const createNotification = async (userId, type, content, refId = null) => {
  return await notificationModel.createNotification(userId, type, content, refId);
};

const markAsRead = async (notificationId) => {
  return await notificationModel.markAsRead(notificationId);
};

const markAllAsRead = async (userId) => {
  return await notificationModel.markAllAsRead(userId);
};

const deleteNotification = async (notificationId) => {
  return await notificationModel.deleteNotification(notificationId);
};

module.exports = {
  getNotificationsByUserId,
  getUnreadCount,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification
};
