const dbConfig = require("../config/db.config.js");
const { Sequelize } = require("sequelize");

// ✅ Create Sequelize instance
const sequelize = new Sequelize(
  dbConfig.database,      // corrected spelling (was databse)
  dbConfig.user,
  dbConfig.password,
  dbConfig.config
);

// ✅ Create db object to hold all models
const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// ✅ Import models
db.medicine = require("./medicine.model.js")(sequelize, Sequelize);
db.user = require("./user.model.js")(sequelize, Sequelize);
db.order = require("./order.model.js")(sequelize, Sequelize);

// ✅ Define relationships (foreign keys)
db.user.hasMany(db.order, { foreignKey: "user_id", as: "orders" });
db.order.belongsTo(db.user, { foreignKey: "user_id", as: "user" });

db.medicine.hasMany(db.order, { foreignKey: "medicine_id", as: "orders" });
db.order.belongsTo(db.medicine, { foreignKey: "medicine_id", as: "medicine" });

// ✅ Export db object
module.exports = db;

