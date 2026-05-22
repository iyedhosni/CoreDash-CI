'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First add the column without unique constraint
    await queryInterface.addColumn('notifications', 'unique_key', {
      type: Sequelize.STRING,
      allowNull: true
    });

    // Then add the unique constraint
    await queryInterface.addConstraint('notifications', {
      fields: ['unique_key'],
      type: 'unique',
      name: 'notifications_unique_key_unique'
    });

    // Add 'github' to the enum type if it doesn't exist
    await queryInterface.sequelize.query(
      "ALTER TABLE notifications CHANGE type type ENUM('jenkins','sonarqube','nexus','dockerhub','test','other','github') DEFAULT 'other'"
    );
  },

  down: async (queryInterface, Sequelize) => {
    // Remove the unique constraint first
    await queryInterface.removeConstraint('notifications', 'notifications_unique_key_unique');
    
    // Then remove the column
    await queryInterface.removeColumn('notifications', 'unique_key');
    
    // Revert the enum type (note: MySQL doesn't support removing enum values, so we just reset to the original)
    await queryInterface.sequelize.query(
      "ALTER TABLE notifications CHANGE type type ENUM('jenkins','sonarqube','nexus','dockerhub','test','other') DEFAULT 'other'"
    );
  }
};
