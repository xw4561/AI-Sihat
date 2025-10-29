/**
 * Session Service
 * Handles in-memory session storage and CRUD operations
 * TODO: Replace with Redis or database for production
 */

// In-memory session store
const sessions = new Map();

/**
 * Create a new session
 * @param {string} sessionId - Unique session identifier
 * @param {object} sessionData - Initial session data
 * @returns {object} Created session
 */
function createSession(sessionId, sessionData) {
  const session = {
    id: sessionId,
    createdAt: new Date(),
    ...sessionData
  };
  sessions.set(sessionId, session);
  return session;
}

/**
 * Get a session by ID
 * @param {string} sessionId - Session identifier
 * @returns {object|null} Session data or null if not found
 */
function getSession(sessionId) {
  return sessions.get(sessionId) || null;
}

/**
 * Update an existing session
 * @param {string} sessionId - Session identifier
 * @param {object} updates - Partial session data to update
 * @returns {object|null} Updated session or null if not found
 */
function updateSession(sessionId, updates) {
  const session = sessions.get(sessionId);
  if (!session) return null;

  const updatedSession = { ...session, ...updates };
  sessions.set(sessionId, updatedSession);
  return updatedSession;
}

/**
 * Delete a session
 * @param {string} sessionId - Session identifier
 * @returns {boolean} True if deleted, false if not found
 */
function deleteSession(sessionId) {
  return sessions.delete(sessionId);
}

/**
 * Get all active sessions (admin/debug only)
 * @returns {Array} Array of all sessions
 */
function getAllSessions() {
  return Array.from(sessions.values());
}

/**
 * Clear all sessions (testing/admin only)
 */
function clearAllSessions() {
  sessions.clear();
}

module.exports = {
  createSession,
  getSession,
  updateSession,
  deleteSession,
  getAllSessions,
  clearAllSessions
};
