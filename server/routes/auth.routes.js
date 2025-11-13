/**
 * Simple Authentication Routes
 */

const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

module.exports = (app) => {
  /**
   * POST /api/auth/register
   * Register a new user
   */
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, email, password } = req.body;

      // Check if email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user with USER role (default)
      const user = await prisma.user.create({
        data: {
          username,
          email,
          password: hashedPassword,
          role: "USER", // Always USER for registration
        },
      });

      res.status(201).json({
        message: "Registration successful",
        user: {
          userId: user.userId,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  /**
   * POST /api/auth/login
   * Login user
   */
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Check password
      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Login successful
      res.json({
        message: "Login successful",
        user: {
          userId: user.userId,
          username: user.username,
          email: user.email,
          role: user.role,
          points: user.points,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  /**
   * PUT /api/auth/change-role
   * Admin only: Change user role
   */
  app.put("/api/auth/change-role", async (req, res) => {
    try {
      const { adminEmail, adminPassword, targetEmail, newRole } = req.body;

      // Verify admin
      const admin = await prisma.user.findUnique({
        where: { email: adminEmail },
      });

      if (!admin || admin.role !== "ADMIN") {
        return res.status(403).json({ error: "Admin access required" });
      }

      // Verify admin password
      const isValidPassword = await bcrypt.compare(adminPassword, admin.password);
      if (!isValidPassword) {
        return res.status(403).json({ error: "Invalid admin credentials" });
      }

      // Update target user's role
      const updatedUser = await prisma.user.update({
        where: { email: targetEmail },
        data: { role: newRole },
      });

      res.json({
        message: "Role updated successfully",
        user: {
          userId: updatedUser.userId,
          username: updatedUser.username,
          email: updatedUser.email,
          role: updatedUser.role,
        },
      });
    } catch (error) {
      console.error("Change role error:", error);
      res.status(500).json({ error: "Failed to change role" });
    }
  });
};
