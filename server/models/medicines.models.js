module.exports = (sequelize, Sequelize) => {
  const Medicine = sequelize.define("medicine", {
    medicine_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    medicine_name: {
      type: Sequelize.STRING(50),
      allowNull: false,
    },
    medicine_type: {
      type: Sequelize.STRING(50),
      allowNull: false,
    },
    medicine_quantity: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
  });

  return Medicine;
};
