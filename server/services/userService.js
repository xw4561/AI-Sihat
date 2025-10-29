/**
 * User Service
 * Business logic for user operations
 */

const bcrypt = require("bcrypt");

/**
 * Create a new user with hashed password
 * @param {object} db - Sequelize db instance
 * @param {object} userData - { username, email, password }
 * @returns {Promise<object>} Created user (without password)
 */
async function createUser(db, userData) {
  const { username, email, password } = userData;

  // Validate required fields
  if (!username || !email || !password) {
    throw new Error("Missing required fields: username, email, password");
  }

  // Check if email already exists
  const existingUser = await db.user.findOne({ where: { email } });
  if (existingUser) {
    throw new Error("Email already registered");
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user
  const newUser = await db.user.create({
    username,
    email,
    password: hashedPassword,
  });

  // Return user without password
  const { password: _, ...userWithoutPassword } = newUser.toJSON();
  return userWithoutPassword;
}

/**
 * Get all users (without passwords)
 * @param {object} db - Sequelize db instance
 * @returns {Promise<Array>} Array of users
 */
async function getAllUsers(db) {
  return await db.user.findAll({
    attributes: ["user_id", "username", "email", "points"],
  });
}

/**
 * Get user by ID (without password)
 * @param {object} db - Sequelize db instance
 * @param {number} userId - User ID
 * @returns {Promise<object|null>} User or null
 */
async function getUserById(db, userId) {
  const user = await db.user.findByPk(userId, {
    attributes: ["user_id", "username", "email", "points"],
  });
  
  if (!user) {
    throw new Error("User not found");
  }
  
  return user;
}

/**
 * Update user points
 * @param {object} db - Sequelize db instance
 * @param {number} userId - User ID
 * @param {number} points - New points value
 * @returns {Promise<object>} Updated user
 */
async function updateUserPoints(db, userId, points) {
  if (typeof points !== "number" || points < 0) {
    throw new Error("Invalid points value");
  }

  const user = await db.user.findByPk(userId);
  if (!user) {
    throw new Error("User not found");
  }

  user.points = points;
  await user.save();

  const { password: _, ...userWithoutPassword } = user.toJSON();
  return userWithoutPassword;
}

/**
 * Add points to user (for rewards, orders, etc.)
 * @param {object} db - Sequelize db instance
 * @param {number} userId - User ID
 * @param {number} pointsToAdd - Points to add
 * @returns {Promise<object>} Updated user
 */
async function addUserPoints(db, userId, pointsToAdd) {
  if (typeof pointsToAdd !== "number" || pointsToAdd < 0) {
    throw new Error("Invalid points value");
  }

  const user = await db.user.findByPk(userId);
  if (!user) {
    throw new Error("User not found");
  }

  user.points += pointsToAdd;
  await user.save();

  const { password: _, ...userWithoutPassword } = user.toJSON();
  return userWithoutPassword;
}

/**
 * Delete a user
 * @param {object} db - Sequelize db instance
 * @param {number} userId - User ID
 * @returns {Promise<boolean>} True if deleted
 */
async function deleteUser(db, userId) {
  const deleted = await db.user.destroy({ where: { user_id: userId } });
  if (!deleted) {
    throw new Error("User not found");
  }
  return true;
}

/**
 * Authenticate user (for future login functionality)
 * @param {object} db - Sequelize db instance
 * @param {string} email - User email
 * @param {string} password - Plain text password
 * @returns {Promise<object>} User object (without password)
 */
async function authenticateUser(db, email, password) {
  const user = await db.user.findOne({ where: { email } });
  if (!user) {
    throw new Error("Invalid credentials");
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    throw new Error("Invalid credentials");
  }

  const { password: _, ...userWithoutPassword } = user.toJSON();
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
