// src/models/index.js
const { Sequelize, DataTypes } = require('sequelize');
const dbConfig                = require('../config/db.config');
const sequelize               = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
  host: dbConfig.HOST, dialect: dbConfig.dialect, pool: dbConfig.pool, logging: false
});

// Initialize all models with the sequelize instance
const User  = require('./User')(sequelize, DataTypes);
const Token = require('./Token')(sequelize, DataTypes);
const Notification = require('./notification')(sequelize, DataTypes);
const UserNotification = require('./UserNotification')(sequelize, DataTypes);
const GitHubRepository = require('./GitHubRepository')(sequelize, DataTypes);

// associations
User.hasMany(Token,           { foreignKey: 'user_id',       onDelete: 'CASCADE' });
Token.belongsTo(User,         { foreignKey: 'user_id' });
Notification.hasMany(UserNotification, { foreignKey: 'notification_id' });
UserNotification.belongsTo(Notification,   { foreignKey: 'notification_id' });
User.hasMany(UserNotification,        { foreignKey: 'user_id' });
UserNotification.belongsTo(User,           { foreignKey: 'user_id' });

module.exports = { sequelize, Sequelize, User, Token, Notification, UserNotification, GitHubRepository };