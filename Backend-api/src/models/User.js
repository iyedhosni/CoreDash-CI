const { DataTypes } = require('sequelize');
const { NotificationService, setSequelize } = require('../services/notification.service');

module.exports = (sequelize) => {
  // Initialize notification service with sequelize instance
  setSequelize(sequelize);
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    first_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    last_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(191),
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM('admin', 'developpeur', 'professional_devops', 'superviseur'),
      allowNull: false,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    emailVerificationCode: {
      type: DataTypes.STRING,
      allowNull: true, // Code is only present when 2FA is pending
    },
    emailVerificationCodeExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true, // Expiry is only relevant when code is present
    },
    isEmailTwoFactorEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    
  }, {
    tableName: 'users',
    timestamps: false,
  });

  // Helper function to send user change notification
  const sendUserChangeNotification = async (user, action) => {
    try {
      let message = `User ${user.email} was ${action}.`;
      if (action === 'updated') {
        message = `User ${user.email} was updated.`;
      } else if (action === 'deleted') {
        message = `User ${user.email} was deleted.`;
      }

      const title = `User ${action.charAt(0).toUpperCase() + action.slice(1)}`;
      
      // Create notification in database and emit to 'admin' room
      const notification = await NotificationService.create({ 
        title: title,
        message: message, 
        type: 'user', 
        role_target: 'admin' 
      });

      // Emit the notification to the admin room
      if (io) {
        io.to('admin').emit('notification', {
          id: notification.id,
          title: title,
          message: message,
          type: 'user',
          date: new Date().toISOString(),
          read: false
        });
      }

    } catch (error) {
      console.error('Error sending user change notification:', error);
    }
  };
  // Add hooks for user changes
  User.afterCreate(async (user) => {
    await sendUserChangeNotification(user, 'created');
  });

  User.afterUpdate(async (user) => {
    // Only send notification if important fields were changed
    if (user.changed('first_name') || user.changed('last_name') || user.changed('email') || user.changed('role')) {
      await sendUserChangeNotification(user, 'updated');
    }
  });

  User.afterDestroy(async (user) => {
    await sendUserChangeNotification(user, 'deleted');
  });

  return User;
};
