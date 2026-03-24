const asyncHandler = require('express-async-handler');
const notificationService = require('../services/notification.service');

const getNotifications = asyncHandler(async (req, res) => {
    const userId = req.user.user_id;
    console.log(`👁 GET /api/notifications for user_id=${userId}`);
    const notifications = await notificationService.getNotificationsByUserId(userId);
    console.log(`✅ Returning ${notifications.length} notifications for user ${userId}`);
    res.json(notifications);
});

const getUnreadCount = asyncHandler(async (req, res) => {
    const userId = req.user.user_id;
    const count = await notificationService.getUnreadCount(userId);
    res.json({ count });
});

const markAsRead = asyncHandler(async (req, res) => {
    const notificationId = req.params.id;
    await notificationService.markAsRead(notificationId);
    res.json({ message: 'Đánh dấu đã đọc thành công' });
});

const markAllAsRead = asyncHandler(async (req, res) => {
    const userId = req.user.user_id;
    await notificationService.markAllAsRead(userId);
    res.json({ message: 'Đánh dấu tất cả đã đọc thành công' });
});

const deleteNotification = asyncHandler(async (req, res) => {
    const notificationId = req.params.id;
    await notificationService.deleteNotification(notificationId);
    res.json({ message: 'Xóa thông báo thành công' });
});

module.exports = {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification
};
