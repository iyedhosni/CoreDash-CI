// routes/notification.routes.js

const express = require('express');
const router = express.Router();
const NotificationModel = require('../models/notification'); 

const { NotificationService } = require('../services/notification.service');
const ctrl   = require('../controllers/notification.controller');
const { verifyToken } = require('../middleware/authJwt');

// GET /api/notifications
// → paginated list: { total, notifications }
router.get('/', verifyToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = parseInt(req.query.offset, 10) || 0;

    const { count, rows } = await NotificationModel.findAndCountAll(
      req.user.id,
      limit,
      offset
    );

    res.json({ total: count, notifications: rows });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/notifications/is-empty
// → { isEmpty: boolean, totalNotifications: number }
router.get('/is-empty', verifyToken, async (req, res) => {
  try {
    const total = await NotificationModel.count(req.user.id);

    res.json({
      isEmpty: total === 0,
      totalNotifications: total,
    });
  } catch (error) {
    console.error('Error checking notifications:', error);
    res.status(500).json({
      error: 'Failed to check notifications',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// POST /api/notifications/:id/read
// → marks one notification as read, returns the updated row
router.post('/:id/read', verifyToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const notification = await NotificationModel.markAsRead(id, req.user.id);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json(notification);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/notifications/mark-all-read
// → marks all of a user’s notifications as read
router.post('/mark-all-read', verifyToken, async (req, res) => {
  try {
    await NotificationModel.markAllRead(req.user.id);
    res.sendStatus(200);
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Add temporarily to a route file for testing
router.post('/test-notification', async (req, res) => {
  const userId = req.body.userId || 16; // example user ID
  const result = await NotificationService.createNotification(
    userId,
    'system',
    'This is a test notification'
  );
  res.json(result);
});



// Marquer TOUTES les notifs d’un user comme lues
router.post('/:userId/mark-all-read', ctrl.markAllRead);

router.get('/:userId', ctrl.getUserNotifications);

module.exports = router;