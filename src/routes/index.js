const express = require('express');
const router = express.Router();


const postRoutes = require('./post.route');
const activityRoutes = require('./activity.route');
const chatRoutes = require('./chat.route');
const uploadRoutes = require('./upload.route');


router.use('/posts', postRoutes);
router.use('/chat', chatRoutes);
router.use('/upload', uploadRoutes);
router.use('/', activityRoutes);

module.exports = router;