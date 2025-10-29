const dbConfig = require("../config/db.config.js");
const Sequelize = require("sequelize");

// ✅ Create Sequelize instance (supports DB_URL or discrete params)
let sequelize;
if (dbConfig.url) {
  sequelize = new Sequelize(dbConfig.url, dbConfig.config);
} else {
  sequelize = new Sequelize(
    dbConfig.database,
    dbConfig.user,
    dbConfig.password,
    dbConfig.config
  );
}

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

