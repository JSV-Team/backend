const express = require('express');
const router = express.Router();

// Import all route files
const activityRoutes = require('./activity.route');
const postsRoutes = require('./posts.routes');
const profileRoutes = require('./profile.routes');
const usersRoutes = require('./users.routes');
const reputationRoutes = require('./reputation.routes');
const notificationRoutes = require('./notification.route');
const loginRoutes = require('./login.route');
const uploadRoutes = require('./upload.route');

// Register all routes - Lưu ý: Thứ tự quan trọng!
router.use('/profile', profileRoutes);   // /api/profile
router.use('/users', usersRoutes);        // /api/users  
router.use('/reputation', reputationRoutes); // /api/reputation
router.use('/notifications', notificationRoutes); // /api/notifications
router.use('/login', loginRoutes);         // /api/login
router.use('/posts', postsRoutes);         // /api/posts
router.use('/activities', activityRoutes);  // /api/activities
router.use('/upload', uploadRoutes);        // /api/upload

module.exports = router;

