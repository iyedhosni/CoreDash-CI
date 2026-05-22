// src/models/UserNotification.js
module.exports = (sequelize, DataTypes) => {
  const UserNotification = sequelize.define('UserNotification', {
    id:              { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    notification_id: { type: DataTypes.INTEGER, allowNull: false },
    user_id:         { type: DataTypes.INTEGER, allowNull: false },
    is_read:         { type: DataTypes.BOOLEAN, defaultValue: false },
    created_at:      { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'user_notifications',
    timestamps: false,
  });

  return UserNotification;
};