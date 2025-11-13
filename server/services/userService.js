/**
 * User Service
 * Business logic for user operations
 */

const bcrypt = require("bcrypt");
const prisma = require("../prisma/client");

/**
 * Create a new user with hashed password
 * @param {object} userData - { username, email, password }
 * @returns {Promise<object>} Created user (without password)
 */
async function createUser(userData) {
  const { username, email, password } = userData;

  // Validate required fields
  if (!username || !email || !password) {
    throw new Error("Missing required fields: username, email, password");
  }

  // Check if email already exists
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new Error("Email already registered");
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user
  const newUser = await prisma.user.create({
    data: {
      username,
      email,
      password: hashedPassword,
    },
  });

  // Return user without password
  const { password: _, ...userWithoutPassword } = newUser;
  return userWithoutPassword;
}

/**
 * Get all users (without passwords)
 * @returns {Promise<Array>} Array of users
 */
async function getAllUsers() {
  return await prisma.user.findMany({
    select: {
      userId: true,
      username: true,
      email: true,
      role: true,
      points: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/**
 * Get user by ID (without password)
 * @param {string} userId - User ID
 * @returns {Promise<object|null>} User or null
 */
async function getUserById(userId) {
  const user = await prisma.user.findUnique({
    where: { userId: userId },
    select: {
      userId: true,
      username: true,
      email: true,
      role: true,
      points: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  
  if (!user) {
    throw new Error("User not found");
  }
  
  return user;
}

/**
 * Update user points
 * @param {string} userId - User ID
 * @param {number} points - New points value
 * @returns {Promise<object>} Updated user
 */
async function updateUserPoints(userId, points) {
  if (typeof points !== "number" || points < 0) {
    throw new Error("Invalid points value");
  }

  const user = await prisma.user.update({
    where: { userId: userId },
    data: { points },
    select: {
      userId: true,
      username: true,
      email: true,
      role: true,
      points: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return user;
}

/**
 * Add points to user (for rewards, orders, etc.)
 * @param {string} userId - User ID
 * @param {number} pointsToAdd - Points to add
 * @returns {Promise<object>} Updated user
 */
async function addUserPoints(userId, pointsToAdd) {
  if (typeof pointsToAdd !== "number" || pointsToAdd < 0) {
    throw new Error("Invalid points value");
  }

  const user = await prisma.user.update({
    where: { userId: userId },
    data: { points: { increment: pointsToAdd } },
    select: {
      userId: true,
      username: true,
      email: true,
      role: true,
      points: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return user;
}

/**
 * Delete a user
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} True if deleted
 */
async function deleteUser(userId) {
  await prisma.user.delete({
    where: { userId: userId },
  });
  return true;
}

/**
 * Authenticate user (for future login functionality)
 * @param {string} email - User email
 * @param {string} password - Plain text password
 * @returns {Promise<object>} User object (without password)
 */
async function authenticateUser(email, password) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error("Invalid credentials");
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    throw new Error("Invalid credentials");
  }

  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  updateUserPoints,
  addUserPoints,
  deleteUser,
  authenticateUser
};
