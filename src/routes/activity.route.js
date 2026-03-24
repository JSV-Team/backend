const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activity.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

// =============================================
// GET /api/activities (Public - list all activities)
// =============================================
router.get('/', activityController.getActivities);

// =============================================
// GET /api/activities/pending-activities (Protected)
// =============================================
router.get('/pending-activities', verifyToken, activityController.getPendingActivities);

// =============================================
// DELETE /api/activities/pending-activities/:id (Protected)
// =============================================
router.delete('/pending-activities/:id', verifyToken, activityController.deleteActivityRequest);

// =============================================
// GET /api/activities/pending-approvals (Protected)
// =============================================
router.get('/pending-approvals', verifyToken, activityController.getPendingApprovals);

// PATCH /api/activities/pending-activities/:id/approve (Protected)
// =============================================
router.patch('/pending-activities/:id/approve', verifyToken, activityController.approveActivityRequest);

// =============================================
// PATCH /api/activities/pending-activities/:id/reject (Protected)
// =============================================
router.patch('/pending-activities/:id/reject', verifyToken, activityController.rejectActivityRequest);

// =============================================
// POST /api/activities/join (Protected)
// =============================================
router.post('/join', verifyToken, activityController.joinActivity);

// =============================================
// DELETE /api/activities/:id (Protected)
// =============================================
router.delete('/:id', verifyToken, activityController.deleteActivity);

router.get('/test-route', (req, res) => res.json({ message: 'Route is active' }));

module.exports = router;
