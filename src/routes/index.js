const express = require('express');
const router = express.Router();

// Import all route files
const postRoutes = require('./post.route');
const activityRoutes = require('./activity.route');
const postsRoutes = require('./posts.routes');
const profileRoutes = require('./profile-update.route');
const usersRoutes = require('./users.routes.new');
const reputationRoutes = require('./reputation.routes');
const notificationRoutes = require('./notification.route');
const loginRoutes = require('./login.route');

// Register all routes
router.use('/posts', postRoutes);        // Original posts route
router.use('/api/posts', postsRoutes);   // New posts route
router.use('/profile', profileRoutes);    // Profile routes
router.use('/users', usersRoutes);
router.use('/reputation', reputationRoutes);
router.use('/notifications', notificationRoutes);
router.use('/login', loginRoutes);
router.use('/', activityRoutes);          // Activity routes (root level)

module.exports = router;

