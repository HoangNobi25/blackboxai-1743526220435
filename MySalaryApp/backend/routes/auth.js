const express = require('express');
const { login, protect, changePassword } = require('../controllers/auth.controller');

const router = express.Router();

// Login route
router.post('/login', login);

// Change password route (protected)
router.post('/change-password', protect, changePassword);

module.exports = router;