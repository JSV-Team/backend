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
// GET /api/pending-approvals?userId=X
// =============================================
router.get('/pending-approvals', activityController.getPendingApprovals);

// =============================================
// PATCH /api/pending-activities/:id/approve
// PATCH /api/activities/pending-activities/:id/approve
// =============================================
router.patch('/pending-activities/:id/approve', activityController.approveActivityRequest);

// =============================================
// PATCH /api/activities/pending-activities/:id/reject
// =============================================
router.patch('/pending-activities/:id/reject', activityController.rejectActivityRequest);
// =============================================
// GET /api/activities
// =============================================
router.get('/', activityController.getActivities);

// =============================================
// POST /api/activities/join
// =============================================
router.post('/join', activityController.joinActivity);
// =============================================
// GET /api/activities/user/:userId
// =============================================
router.get('/user/:userId', activityController.getUserActivities);

// =============================================
// DELETE /api/activities/:id
// =============================================
router.delete('/:id', activityController.deleteActivity);

router.get('/test-route', (req, res) => res.json({ message: 'Route is active' }));

module.exports = router;

