const express = require('express');
const router = express.Router();
const matchController = require('../controllers/match.controller');

// POST /api/match/enable
router.post('/enable', matchController.enableMatching);

// POST /api/match/disable
router.post('/disable', matchController.disableMatching);

// GET /api/match/status
router.get('/status', matchController.getStatus);

// POST /api/match/find
router.post('/find', matchController.findMatch);

// POST /api/match/end
router.post('/end', matchController.endMatch);

module.exports = router;
