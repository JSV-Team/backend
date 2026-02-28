const express = require('express');
const router = express.Router();

const notificationRoutes = require('./notification.route');
const postRoutes = require('./post.route');
const activityRoutes = require('./activity.route');

router.use('/notifications', notificationRoutes);
router.use('/posts', postRoutes);
router.use('/', activityRoutes);

module.exports = router;