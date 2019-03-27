'use strict';
module.exports = (sequelize, DataTypes) => {
  const Tweet = sequelize.define('Tweet', {
    // userId: DataTypes.INTEGER,
    description: DataTypes.TEXT,
    // replies_count: DataTypes.INTEGER,
    // likes_count: DataTypes.INTEGER,
  }, {});
  Tweet.associate = function(models) {
    // associations can be defined here
    Tweet.hasMany(models.Reply)
    Tweet.hasMany(models.Like)
    Tweet.belongsTo(models.User)
  };
  return Tweet;
};