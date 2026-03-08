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
// GET /api/pending-approvals?userId=X
// =============================================
router.get('/pending-approvals', activityController.getPendingApprovals);

// =============================================
// PATCH /api/pending-activities/:id/approve
// =============================================
router.patch('/pending-activities/:id/approve', activityController.approveActivityRequest);

// =============================================
// PATCH /api/pending-activities/:id/reject
// =============================================
router.patch('/pending-activities/:id/reject', activityController.rejectActivityRequest);

// =============================================
// GET /api/activities
// =============================================
router.get('/activities', activityController.getActivities);

// =============================================
// POST /api/activities/join
// =============================================
router.post('/activities/join', activityController.joinActivity);

module.exports = router;
