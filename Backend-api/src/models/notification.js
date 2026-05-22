// src/models/Notification.js
module.exports = (sequelize, DataTypes) => {
  const Notification = sequelize.define('Notification', {
    id:          { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    title:       { type: DataTypes.STRING, allowNull: false },
    message:     { type: DataTypes.TEXT,   allowNull: false },
    type:        { type: DataTypes.ENUM('jenkins','sonarqube','nexus','dockerhub','test','other','github'), defaultValue: 'other' },
    role_target: { type: DataTypes.ENUM('admin','developpeur','professional_devops','superviseur'), allowNull: false },
    unique_key:  { type: DataTypes.STRING, unique: true, allowNull: true },
    created_at:  { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'notifications',
    timestamps: false,
  });

  return Notification;
};