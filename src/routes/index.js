const express = require('express');
const router = express.Router();

// Import all route files
const postRoutes = require('./post.route');
const activityRoutes = require('./activity.route');

const postsRoutes = require('./posts.routes');
const profileRoutes = require('./profile.routes');
const usersRoutes = require('./users.routes.new');
const reputationRoutes = require('./reputation.routes');

// Register all routes
router.use('/posts', postRoutes);        // Original posts route
router.use('/api/posts', postsRoutes);   // New posts route (profile, etc.)
router.use('/api/profile', profileRoutes);
router.use('/api/users', usersRoutes);
router.use('/api/reputation', reputationRoutes);
router.use('/', activityRoutes);

const notificationRoutes = require('./notification.route');
const loginRoutes = require('./login.route');
// mount sub‑routers
router.use('/posts', postRoutes);
router.use('/', activityRoutes);    // activityRoutes define their own paths (e.g. /activities)
router.use('/notifications', notificationRoutes);
router.use('/login', loginRoutes);

module.exports = router;
