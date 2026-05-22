const db = require('../models'); // Sequelize ou ta lib d'accès DB

exports.createNotification = async (req, res) => {
  const { title, message, type, role_target } = req.body;

  try {
    const notif = await db.notifications.create({ title, message, type, role_target });

    // Lier à tous les users avec ce rôle
    const users = await db.users.findAll({ where: { role: role_target, is_active: 1 } });

    const userNotifs = users.map(user => ({
      notification_id: notif.id,
      user_id: user.id,
    }));

    await db.user_notifications.bulkCreate(userNotifs);

    res.status(201).json({ message: 'Notification saved and dispatched.', notif });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create notification.' });
  }
};

const { UserNotification, Notification } = require('../models');

exports.getUserNotifications = async (req, res) => {
  try {
    const rows = await UserNotification.findAll({
      where: { user_id: req.params.userId },
      include: [ Notification ],
      order: [['created_at','DESC']],
    });
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fetch failed' });
  }
};



exports.markAllRead = async (req, res) => {
  try {
    const userId = req.params.userId;
    await UserNotification.update(
      { is_read: true },
      { where: { user_id: userId, is_read: false } }
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Impossible de marquer toutes les notifications comme lues' });
  }
};