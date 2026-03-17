const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { isAdmin } = require('../middlewares/admin.middleware');

// All routes here should be protected by isAdmin (in a real app, also by auth)
router.get('/stats', isAdmin, adminController.getAdminStats);
router.get('/users', isAdmin, adminController.getAllUsers);
router.put('/users/:id/status', isAdmin, adminController.toggleUserStatus);
router.put('/users/:id/lock', isAdmin, adminController.toggleUserLock);

// Activities
router.get('/activities', isAdmin, adminController.getAllActivities);
router.put('/activities/:id/status', isAdmin, adminController.updateActivityStatus);

router.get('/reports', isAdmin, adminController.getAllReports);
router.put('/reports/:id/status', isAdmin, adminController.updateReportStatus);
router.get('/detailed-stats', isAdmin, adminController.getDetailedStatistics);
router.get('/search', isAdmin, adminController.searchAdmin);
router.get('/settings', isAdmin, adminController.getSystemSettings);
router.put('/settings', isAdmin, adminController.updateSystemSettings);

// Banned Keywords
router.get('/banned-keywords', isAdmin, adminController.getBannedKeywords);
router.post('/banned-keywords', isAdmin, adminController.addBannedKeyword);
router.delete('/banned-keywords/:id', isAdmin, adminController.deleteBannedKeyword);

module.exports = router;
