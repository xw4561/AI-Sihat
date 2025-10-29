const dialect = (process.env.DB_DIALECT || "postgres").toLowerCase();
const useSSL = String(process.env.DB_SSL || "true").toLowerCase() === "true";

// Base config shared across dialects
const baseConfig = {
  host: process.env.DB_HOST || process.env.HOST,
  dialect,
  port: process.env.DB_PORT,
  logging: false,
  timezone: process.env.TIMEZONE,
  pool: {
    max: 5,
    min: 0,
    acquire: 50000,
    idle: 15000,
  },
};

// Extra per-dialect options
if (dialect === "postgres") {
  baseConfig.dialectOptions = {
    ssl: useSSL
      ? { require: true, rejectUnauthorized: false }
      : undefined,
  };
}

const database = {
  url: process.env.DB_URL, // Optional full connection string
  database: process.env.DB || process.env.DB_NAME,
  user: process.env.DB_USER || process.env.USER,
  password: process.env.DB_PASSWORD || process.env.PW,
  config: baseConfig,
};

module.exports = database;
