/**
 * MatchQueue - Manages user queue for interest-based matching
 * Ensures uniqueness invariant: each user can only appear once in the queue
 */
class MatchQueue {
  constructor() {
    this.queue = new Map();
  }

  /**
   * Add a user to the queue
   * @param {Object} user - User object with { userId, interests, joinedAt, socketId, status, userInfo }
   * @returns {boolean} - True if user was added, false if already exists
   */
  addUser(user) {
    if (!user || !user.userId) {
      return false;
    }

    // Uniqueness invariant: user can only appear once
    if (this.queue.has(user.userId)) {
      return false;
    }

    // Set joinedAt timestamp if not provided
    const userData = {
      ...user,
      joinedAt: user.joinedAt || new Date(),
      status: user.status || 'waiting',
    };

    this.queue.set(user.userId, userData);
    return true;
  }

  /**
   * Remove a user from the queue
   * @param {string} userId - The user ID to remove
   * @returns {boolean} - True if user was removed, false if not found
   */
  removeUser(userId) {
    return this.queue.delete(userId);
  }

  /**
   * Get all users in the queue
   * @returns {Array} - Array of user objects
   */
  getUsers() {
    return Array.from(this.queue.values());
  }

  /**
   * Get the size of the queue
   * @returns {number} - Number of users in queue
   */
  getSize() {
    return this.queue.size;
  }

  /**
   * Check if a user is in the queue
   * @param {string} userId - The user ID to check
   * @returns {boolean} - True if user exists in queue
   */
  hasUser(userId) {
    return this.queue.has(userId);
  }

  /**
   * Reset timeout/heartbeat for a user
   * Updates the joinedAt timestamp to current time
   * @param {string} userId - The user ID to reset timeout for
   * @returns {boolean} - True if timeout was reset, false if user not found
   */
  resetTimeout(userId) {
    const user = this.queue.get(userId);
    if (!user) {
      return false;
    }

    user.joinedAt = new Date();
    this.queue.set(userId, user);
    return true;
  }

  /**
   * Get user information from the queue
   * @param {string} userId - The user ID to retrieve
   * @returns {Object|null} - User object or null if not found
   */
  getUser(userId) {
    return this.queue.get(userId) || null;
  }
}

module.exports = MatchQueue;