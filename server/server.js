// server.js
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const prisma = require("./prisma/client");

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

// Database connection check on startup
(async () => {
  try {
    await prisma.$connect();
    console.log("✅ Database connection established (Prisma)");
  } catch (err) {
    console.warn("⚠️ DB connection warning:", err?.message || err);
  }
})();

// DB health check endpoint
app.get("/api/db/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, dialect: "postgresql" });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Mount auth routes
try {
  require("./routes/auth.routes.js")(app);
  console.log("✅ Auth routes loaded");
} catch (e) {
  console.warn("ℹ️ Auth routes mounting skipped:", e?.message || e);
}

// Mount chat routes
try {
  require("./routes/chat.routes.js")(app);
} catch (e) {
  console.warn("ℹ️ Chat routes mounting skipped:", e?.message || e);
}

// Mount REST routes (Users, Medicines, Orders)
try {
  require("./routes/router.routes.js")(app);
} catch (e) {
  console.warn("ℹ️ API route mounting skipped:", e?.message || e);
}

// Log registered routes (helpful for debugging missing endpoints)
try {
  const routes = [];
  if (app && app._router && app._router.stack) {
    app._router.stack.forEach((layer) => {
      if (layer.route && layer.route.path) {
        const methods = Object.keys(layer.route.methods).join(',').toUpperCase();
        routes.push(`${methods} ${layer.route.path}`);
      }
    });
  }
  console.log('Registered routes:\n', routes.join('\n'));
} catch (err) {
  console.warn('Could not list routes:', err && err.message);
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

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
