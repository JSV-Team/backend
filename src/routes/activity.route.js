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
// PATCH /api/pending-activities/:id/approve
// =============================================
router.patch('/pending-activities/:id/approve', activityController.approveActivityRequest);

// =============================================
// GET /api/activities
// =============================================
router.get('/', activityController.getActivities);

// =============================================
// POST /api/activities/join
// =============================================
router.post('/join', activityController.joinActivity);

// =============================================
// DELETE /api/activities/:id
// =============================================
router.delete('/:id', activityController.deleteActivity);

router.get('/test-route', (req, res) => res.json({ message: 'Route is active' }));

module.exports = router;

