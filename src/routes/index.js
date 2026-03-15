const express = require('express');
const router = express.Router();

// Import all route files
const activityRoutes = require('./activity.route');
const postsRoutes = require('./posts.routes');
const profileRoutes = require('./profile.routes');
const usersRoutes = require('./users.routes');
const reputationRoutes = require('./reputation.routes');
const notificationRoutes = require('./notification.route');
<<<<<<< HEAD
const authRoutes = require('./auth.routes');
// mount sub‑routers
const chatRoutes = require('./chat.route');
=======
>>>>>>> 7170bdf7d2848c9df469f7a15dbb183c2602c654
const loginRoutes = require('./login.route');
const uploadRoutes = require('./upload.route');

// Register all routes - Lưu ý: Thứ tự quan trọng!
router.use('/profile', profileRoutes);       // /api/profile
router.use('/users', usersRoutes);           // /api/users
router.use('/reputation', reputationRoutes); // /api/reputation
router.use('/notifications', notificationRoutes); // /api/notifications
router.use('/login', loginRoutes);         // /api/login
router.use('/posts', postsRoutes);         // /api/posts - From posts.routes.js
// router.use('/posts', postRoutes);       // Note: post.route.js exists but conflicts with posts.routes.js, disabled for safety
router.use('/activities', activityRoutes);  // /api/activities
router.use('/upload', uploadRoutes);        // /api/upload
router.use('/chat', chatRoutes);            // /api/chat

<<<<<<< HEAD
=======
router.use('/posts', postRoutes);
router.use('/', activityRoutes);    // activityRoutes define their own paths (e.g. /activities)
router.use('/notifications', notificationRoutes);
router.use('/auth', authRoutes);
router.use('/chat', chatRoutes);
router.use('/upload', uploadRoutes);
router.use('/', activityRoutes);

>>>>>>> 7170bdf7d2848c9df469f7a15dbb183c2602c654
module.exports = router;
