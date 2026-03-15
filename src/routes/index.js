const express = require('express');
const router = express.Router();

// Import routes
const activityRoutes = require('./activity.route');
const postsRoutes = require('./posts.routes');
const profileRoutes = require('./profile.routes');
const usersRoutes = require('./users.routes');
const reputationRoutes = require('./reputation.routes');
const notificationRoutes = require('./notification.route');
const loginRoutes = require('./login.route');
const uploadRoutes = require('./upload.route');
const chatRoutes = require('./chat.route');
const authRoutes = require('./auth.routes');
const adminRoutes = require('./admin.routes');

// Register routes
router.use('/profile', profileRoutes);
router.use('/users', usersRoutes);
router.use('/reputation', reputationRoutes);
router.use('/notifications', notificationRoutes);
router.use('/login', loginRoutes);
router.use('/posts', postsRoutes);
router.use('/activities', activityRoutes);
router.use('/upload', uploadRoutes);
router.use('/chat', chatRoutes);
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
