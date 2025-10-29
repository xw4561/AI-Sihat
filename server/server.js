// server.js
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

// Configure CORS from env (CORS_ORIGIN supports comma-separated origins); default allows all
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map(s => s.trim()).filter(Boolean)
  : [];
const corsOptions = allowedOrigins.length > 0 ? { origin: allowedOrigins } : undefined;
app.use(cors(corsOptions));
app.use(express.json());

const PORT = process.env.PORT || 3000;


// Simple health/test endpoint (useful for client/dev checks)
app.get("/api/test", (req, res) => {
  res.json({
    message: "Test API is working!",
    timestamp: new Date().toISOString(),
    status: "success",
  });
});

// Initialize DB (optional, if env present)
let db;
try {
  db = require("./models");
  if (db && db.sequelize && db.sequelize.authenticate) {
    db.sequelize.authenticate()
      .then(() => {
        console.log("✅ Database connection established");
        return db.sequelize.sync();
      })
      .then(() => console.log("✅ Database synced"))
      .catch((err) => console.warn("⚠️ DB init warning:", err?.message || err));
  }
} catch (e) {
  // models are optional; skip if not configured
}

// DB health check endpoint
app.get("/api/db/health", async (req, res) => {
  try {
    if (!db || !db.sequelize) {
      return res.status(503).json({ ok: false, error: "DB not initialized" });
    }
    await db.sequelize.authenticate();
    await db.sequelize.query("SELECT 1");
    res.json({ ok: true, dialect: db.sequelize.getDialect() });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Mount chat routes
try {
  require("./routes/chat.routes.js")(app);
} catch (e) {
  console.warn("ℹ️ Chat routes mounting skipped:", e?.message || e);
}

// Mount legacy REST routes (Users, Medicines, Orders)
try {
  require("./routes/router.routes.js")(app);
} catch (e) {
  // Routes are optional; log once if missing or failing to load
  console.warn("ℹ️ API route mounting skipped:", e?.message || e);
}

// 404 handler for unknown routes
app.use((req, res, next) => {
  res.status(404).json({ error: "Not Found" });
});

// Centralized error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
