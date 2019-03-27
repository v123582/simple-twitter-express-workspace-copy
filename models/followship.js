'use strict';
module.exports = (sequelize, DataTypes) => {
  const Followship = sequelize.define('Followship', {
    userId: DataTypes.INTEGER,
    followingId: DataTypes.INTEGER
  }, {});
  Followship.associate = function(models) {
    // associations can be defined here
    // Followship.belongsTo(models.User, {foreignKey: 'userId'})
    // Followship.belongsTo(models.User, {foreignKey: 'followingId'})
  };
  return Followship;
};