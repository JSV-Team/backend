const express = require('express');
const router = express.Router();


const postRoutes = require('./post.route');
const activityRoutes = require('./activity.route');
const notificationRoutes = require('./notification.route');
const loginRoutes = require('./login.route');
// mount sub‑routers
const chatRoutes = require('./chat.route');
const uploadRoutes = require('./upload.route');


router.use('/posts', postRoutes);
router.use('/', activityRoutes);    // activityRoutes define their own paths (e.g. /activities)
router.use('/notifications', notificationRoutes);
router.use('/login', loginRoutes);
router.use('/chat', chatRoutes);
router.use('/upload', uploadRoutes);

module.exports = router;