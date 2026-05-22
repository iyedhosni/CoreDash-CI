const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth.middleware.js'); 

// Public routes
router.post('/login', authController.login);
router.post('/verify-2fa-login', authController.verifyEmail2FALogin);

router.post('/logout', authController.logout); 

// Protected routes - for managing 2FA settings and changing password (require user to be logged in)
router.post('/change-password', protect, authController.changePassword); 
router.post('/request-2fa-setup', protect, authController.requestEmail2FASetup); 
router.post('/verify-2fa-setup', protect, authController.verifyEmail2FASetup);   
router.post('/disable-2fa', protect, authController.disableEmail2FA);       

module.exports = router;
