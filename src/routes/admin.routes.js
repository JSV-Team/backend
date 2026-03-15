const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { isAdmin } = require('../middlewares/admin.middleware');

// All routes here should be protected by isAdmin (in a real app, also by auth)
router.get('/stats', isAdmin, adminController.getAdminStats);
router.get('/users', isAdmin, adminController.getAllUsers);

module.exports = router;
