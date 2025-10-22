const database = {
  database: process.env.DB,
  user: process.env.USER,
  password: process.env.PW,
  config: {
    host: process.env.HOST,
    dialect: "mysql",
    port: process.env.DB_PORT,
    logging: false,
    timezone: process.env.TIMEZONE,
    charset: "utf8",
    collate: "utf8_general_ci",
    dialectOptions: {
      timezone: "local",
      dateStrings: true,
      typeCast: true,
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 50000,
      idle: 15000,
    },
  },
};

module.exports = database;
