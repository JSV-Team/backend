const express = require('express');
const router = express.Router();


const postRoutes = require('./post.route');
const activityRoutes = require('./activity.route');


router.use('/posts', postRoutes);
router.use('/', activityRoutes);

module.exports = router;