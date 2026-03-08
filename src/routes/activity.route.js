const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activity.controller');

// =============================================
// GET /api/activities/pending-activities?userId=X
// =============================================
router.get('/pending-activities', activityController.getPendingActivities);

// =============================================
// DELETE /api/activities/pending-activities/:id
// =============================================
router.delete('/pending-activities/:id', activityController.deleteActivityRequest);

// =============================================
// GET /api/activities
// =============================================
router.get('/', activityController.getActivities);

// =============================================
// POST /api/activities/join
// =============================================
router.post('/join', activityController.joinActivity);

module.exports = router;

