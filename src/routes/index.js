const express = require('express');
const router = express.Router();

// Import all route files
const postRoutes = require('./post.route');
const activityRoutes = require('./activity.route');
const postsRoutes = require('./posts.routes');
const profileRoutes = require('./profile.routes');
const usersRoutes = require('./users.routes');
const reputationRoutes = require('./reputation.routes');
const notificationRoutes = require('./notification.route');
const loginRoutes = require('./login.route');
<<<<<<< HEAD
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
=======
// mount sub‑routers
const chatRoutes = require('./chat.route');
const uploadRoutes = require('./upload.route');


router.use('/posts', postRoutes);
router.use('/', activityRoutes);    // activityRoutes define their own paths (e.g. /activities)
router.use('/notifications', notificationRoutes);
router.use('/login', loginRoutes);
router.use('/chat', chatRoutes);
router.use('/upload', uploadRoutes);
router.use('/', activityRoutes);
>>>>>>> main

