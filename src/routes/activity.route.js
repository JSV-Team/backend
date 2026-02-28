const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activity.controller');

// =============================================
// GET /api/pending-activities?userId=X
// =============================================
router.get('/pending-activities', activityController.getPendingActivities);

// =============================================
// DELETE /api/pending-activities/:id
// =============================================
router.delete('/pending-activities/:id', activityController.deleteActivityRequest);

// =============================================
// GET /api/activities
// =============================================
router.get('/activities', activityController.getActivities);

// =============================================
// POST /api/activities/join
// =============================================
router.post('/activities/join', activityController.joinActivity);

module.exports = router;
