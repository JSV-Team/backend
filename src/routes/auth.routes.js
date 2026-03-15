const express = require('express');
const router = express.Router();
const loginController = require('../controllers/login.controller');
const registerController = require('../controllers/register.controller');

// Auth endpoints
router.post('/login', loginController.handleLogin);
router.post('/register', registerController.handleRegister);

module.exports = router;
