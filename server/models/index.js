const dbConfig = require("../config/db.config.js");
const Sequelize = require("sequelize");

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
db.medicine = require("./medicines.models.js")(sequelize, Sequelize);
db.user = require("./users.models.js")(sequelize, Sequelize);
db.order = require("./orders.models.js")(sequelize, Sequelize);



// ✅ Export db object
module.exports = db;

