const { sendMail } = require('../utils/mailer');
const { Op } = require('sequelize');

let ioInstance;
let models;

function setSequelize(sequelize) {
  models = sequelize.models;
}

function setSocketIO(io) {
  ioInstance = io;
}

class NotificationService {
  static async create({ title, message, type = 'other', role_target = 'admin' }) {
    if (!models) {
      throw new Error('Models not initialized. Call setSequelize() first.');
    }
    
    const { Notification, User, UserNotification } = models;
    
    try {
      // 1) Create notification in database with a unique key to prevent exact duplicates
      const notif = await Notification.create({ 
        title, 
        message, 
        type, 
        role_target,
        // Add a unique key to prevent exact duplicates
        unique_key: `${type}-${role_target}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      });

      // 2) Link notification to all active users with the target role
      const users = await User.findAll({ where: { role: role_target, is_active: 1 } });
      
      if (users && users.length > 0) {
        const rows = users.map(user => ({
          notification_id: notif.id,
          user_id: user.id,
        }));
        await UserNotification.bulkCreate(rows);
      }

      // 3) Emit socket event if ioInstance is available
      if (ioInstance) {
        ioInstance.to(role_target).emit('notification', {
          id: notif.id,
          title,
          message,
          type,
          date: new Date(),
          read: false
        });
      }

      return notif;
    } catch (error) {
      console.error('Error in NotificationService.create:', error);
      throw error;
    }
  }

  static async createNotification(userId, type, message, relatedEntityId = null, email = null) {
    if (!sequelizeInstance) {
      throw new Error('Sequelize instance not set. Call setSequelize() first.');
    }
    
    const { Notification } = sequelizeInstance.models;
    
    const notification = await Notification.create({
      user_id: userId,
      type,
      message,
      related_entity_id: relatedEntityId
    });

    // Emit via WebSocket if available
    if (ioInstance) {
      console.log(`Emitting to user_${userId}:`, notification);
      ioInstance.to(`user_${userId}`).emit('new_notification', notification);
    }
    if (email) {
      try {
        const subject = `New Notification: ${type}`;
        await sendMail(email, subject, `<p>${message}</p>`);
        console.log(`Email sent to ${email}`);
      } catch (error) {
        console.error(`Failed to send email to ${email}:`, error);
      }
    }
    return notification;
  }

  static async getNotifications(userId, limit = 20, offset = 0) {
    if (!sequelizeInstance) {
      throw new Error('Sequelize instance not set. Call setSequelize() first.');
    }
    
    const { UserNotification, Notification } = sequelizeInstance.models;
    
    const userNotifications = await UserNotification.findAll({
      where: { user_id: userId },
      include: [{ model: Notification }],
      limit,
      offset
    });

    return userNotifications.map(userNotification => userNotification.Notification);
  }

  static async getNotificationCount(userId) {
    if (!sequelizeInstance) {
      throw new Error('Sequelize instance not set. Call setSequelize() first.');
    }
    
    const { UserNotification } = sequelizeInstance.models;
    
    return await UserNotification.count({ where: { user_id: userId } });
  }

  static async markAsRead(id, userId) {
    if (!sequelizeInstance) {
      throw new Error('Sequelize instance not set. Call setSequelize() first.');
    }
    
    const { UserNotification } = sequelizeInstance.models;
    
    return await UserNotification.update({ read: true }, { where: { id, user_id: userId } });
  }

  static async markAllRead(userId) {
    if (!sequelizeInstance) {
      throw new Error('Sequelize instance not set. Call setSequelize() first.');
    }
    
    const { UserNotification } = sequelizeInstance.models;
    
    return await UserNotification.update({ read: true }, { where: { user_id: userId } });
  }
}

module.exports = {
  NotificationService,
  setSocketIO,
  setSequelize
};