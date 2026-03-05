const express = require('express');
const router = express.Router();
const loginController = require('../controllers/login.controller');

// Đón method POST
router.post('/', loginController.handleLogin);

module.exports = router;