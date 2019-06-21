'use strict';
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    email: DataTypes.STRING,
    password: DataTypes.STRING,
    name: DataTypes.STRING,
    avatar: DataTypes.STRING,
    introduction: DataTypes.TEXT,
    role: DataTypes.STRING,
  }, {});
  User.associate = function(models) {
    // associations can be defined here
    User.hasMany(models.Reply)
    User.hasMany(models.Tweet)
    User.hasMany(models.Like)

    User.belongsToMany(User, {
      through: models.Followship,
      as: 'Following',
      foreignKey: 'followerId',
    });
    User.belongsToMany(User, {
      through: models.Followship,
      as: 'Follower',
      foreignKey: 'followingId',
    });
  };
  return User;
};