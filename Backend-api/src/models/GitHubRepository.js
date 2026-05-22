module.exports = (sequelize, DataTypes) => {
  const GitHubRepository = sequelize.define('GitHubRepository', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    link: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    status: {
      type: DataTypes.ENUM('Completed', 'In Progress', 'On Hold'),
      defaultValue: 'In Progress',
    },
    priority: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Higher number means higher priority'
    },
  }, {
    tableName: 'github_repositories',
    timestamps: true,
  });

  return GitHubRepository;
};