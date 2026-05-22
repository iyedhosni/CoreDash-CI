const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Add authentication middleware as needed

router.get('/count', userController.getUserCount);
router.get('/count/admins', userController.getTotalAdminsCount); // New route for admin count
router.get('/count/active', userController.getTotalActiveUsersCount); // New route for active users count
router.get('/roles/distribution', userController.getUserRoleDistribution);
router.get('/', userController.getAllUsers);
router.post('/', userController.createUser);
router.patch('/:id', userController.updateUser);
router.patch('/:id/password', userController.updatePassword);
router.delete('/:id', userController.deleteUser);

module.exports = router;