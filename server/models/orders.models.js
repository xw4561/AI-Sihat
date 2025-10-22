module.exports = (sequelize, Sequelize) => {
  const Order = sequelize.define("order", {
    order_id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    medicine_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    quantity: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    order_type: {
      type: Sequelize.ENUM("pickup", "delivery"),
      allowNull: false,
    },
    use_ai: {
      type: Sequelize.BOOLEAN,
      defaultValue: false, // true = AI consultation used
    },
    total_points: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    },
    status: {
      type: Sequelize.ENUM("pending", "completed", "cancelled"),
      defaultValue: "pending",
    },
  });

  return Order;
};

