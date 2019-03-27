'use strict';
module.exports = (sequelize, DataTypes) => {
  const Like = sequelize.define('Like', {
    // userId: DataTypes.INTEGER,
    // tweetId: DataTypes.INTEGER
  }, {});
  Like.associate = function(models) {
    // associations can be defined here
    Like.belongsTo(models.User)
    Like.belongsTo(models.Tweet)
  };
  return Like;
};