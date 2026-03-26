/**
 * MatchQueue - Manages user queue for interest-based matching
 * Ensures uniqueness invariant: each user can only appear once in the queue
 */
class MatchQueue {
  constructor() {
    this.queue = new Map();
  }

  /**
   * Add a user to the queue or update existing user info
   * @param {Object} user - User object with { userId, interests, joinedAt, socketId, status, userInfo }
   * @returns {boolean} - True if user was added or updated
   */
  addUser(user) {
    if (!user || user.userId === undefined) {
      return false;
    }

    // Check if user already exists
    const existingUser = this.queue.get(user.userId);
    
    if (existingUser) {
      // Update existing user info (socketId, interests, etc.) 
      // but KEEP original joinedAt to preserve queue priority
      const updatedUser = {
        ...existingUser,
        ...user,
        joinedAt: existingUser.joinedAt, // Preserving original wait time
        status: user.status || existingUser.status || 'waiting'
      };
      
      this.queue.set(user.userId, updatedUser);
      console.log(`🔄 Updated queue entry for user ${user.userId} (new socket: ${user.socketId})`);
      return true;
    }

    // Set joinedAt timestamp if not provided
    const userData = {
      ...user,
      joinedAt: user.joinedAt || new Date(),
      status: user.status || 'waiting',
    };

    this.queue.set(user.userId, userData);
    console.log(`✅ Added new user ${user.userId} to queue (socket: ${user.socketId})`);
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