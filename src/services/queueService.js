const MatchQueue = require('./queueManager');
const interestService = require('./interestService');
const matchService = require('./matchService');

// Constants
const QUEUE_TIMEOUT = 120; // seconds
const MAX_QUEUE_SIZE = 1000;

// Create singleton instance of MatchQueue
const matchQueue = new MatchQueue();

/**
 * Validate user before joining queue
 * @param {number} userId - User ID
 * @returns {Object} - { valid: boolean, error?: string, errorCode?: string }
 */
async function validateUser(userId) {
  // Check if user exists and is not banned
  const userInfo = await matchService.getUserInfo(userId);
  
  if (!userInfo) {
    return {
      valid: false,
      error: 'Người dùng không tồn tại',
      errorCode: 'USER_NOT_FOUND'
    };
  }

  // Check if user is active (not banned)
  // The getUserInfo query already filters by status = 'active'
  // If userInfo is null, it means user is not active (banned/inactive)
  // Note: We need to check the actual status field from users table
  
  // Get user status from database
  const { getPool } = require('../config/db');
  const pool = getPool();
  const statusQuery = await pool.query(
    'SELECT status FROM users WHERE user_id = $1',
    [userId]
  );
  
  if (statusQuery.rows.length === 0) {
    return {
      valid: false,
      error: 'Người dùng không tồn tại',
      errorCode: 'USER_NOT_FOUND'
    };
  }
  
  const userStatus = statusQuery.rows[0].status;
  if (userStatus !== 'active') {
    return {
      valid: false,
      error: 'Tài khoản của bạn đã bị khóa',
      errorCode: 'USER_BANNED'
    };
  }

  // Check if user has at least 1 interest
  const interests = await interestService.getUserInterests(userId);
  console.log(`🔍 validateUser(${userId}): Checking interests...`);
  console.log(`   Interests found: ${interests ? interests.length : 0}`);
  if (!interests || interests.length === 0) {
    console.log(`❌ validateUser(${userId}): NO_INTERESTS error`);
    return {
      valid: false,
      error: 'Vui lòng thêm sở thích trước khi ghép đôi',
      errorCode: 'NO_INTERESTS'
    };
  }

  return { valid: true };
}

/**
 * Add user to the matching queue
 * @param {number} userId - User ID
 * @param {Object} userInfo - Additional user info (socketId, etc.)
 * @returns {Object} - Result object with success/error
 */
async function joinQueue(userId, userInfo = {}) {
  try {
    // Check if queue is full
    if (matchQueue.getSize() >= MAX_QUEUE_SIZE) {
      return {
        success: false,
        error: 'Hàng đợi đã đầy, vui lòng thử lại sau',
        errorCode: 'QUEUE_FULL'
      };
    }

    // Check if user is already in queue
    if (matchQueue.hasUser(userId)) {
      return {
        success: false,
        error: 'Bạn đang trong hàng đợi',
        errorCode: 'ALREADY_IN_QUEUE'
      };
    }

    // Validate user (check status and interests)
    const validation = await validateUser(userId);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
        errorCode: validation.errorCode
      };
    }

    // Get user interests
    const interests = await interestService.getUserInterests(userId);
    
    // Get full user info for match notification
    const fullUserInfo = await matchService.getUserInfo(userId);

    // Create queue entry
    const queueEntry = {
      userId,
      interests: interests.map(i => i.interest_id),
      interestNames: interests.map(i => i.name),
      joinedAt: new Date(),
      socketId: userInfo.socketId || null,
      status: 'waiting',
      userInfo: {
        user_id: fullUserInfo.user_id,
        username: fullUserInfo.username,
        full_name: fullUserInfo.full_name,
        avatar_url: fullUserInfo.avatar_url,
        bio: fullUserInfo.bio
      }
    };

    // Add to queue
    const added = matchQueue.addUser(queueEntry);
    
    if (!added) {
      return {
        success: false,
        error: 'Không thể tham gia hàng đợi',
        errorCode: 'JOIN_FAILED'
      };
    }

    // Calculate estimated wait time (simple estimation based on queue size)
    const queueSize = matchQueue.getSize();
    const estimatedWaitTime = Math.max(30, queueSize * 15); // ~15 seconds per person

    return {
      success: true,
      data: {
        queueSize,
        estimatedWaitTime,
        message: 'Bạn đã tham gia hàng đợi'
      }
    };
  } catch (error) {
    console.error('Error in joinQueue:', error);
    return {
      success: false,
      error: 'Lỗi hệ thống',
      errorCode: 'SYSTEM_ERROR'
    };
  }
}

/**
 * Remove user from the matching queue
 * @param {number} userId - User ID
 * @returns {Object} - Result object with success/error
 */
function cancelQueue(userId) {
  try {
    // Check if user is in queue
    if (!matchQueue.hasUser(userId)) {
      return {
        success: false,
        error: 'Bạn không có trong hàng đợi',
        errorCode: 'NOT_IN_QUEUE'
      };
    }

    // Remove from queue
    const removed = matchQueue.removeUser(userId);
    
    if (!removed) {
      return {
        success: false,
        error: 'Không thể hủy tham gia hàng đợi',
        errorCode: 'CANCEL_FAILED'
      };
    }

    return {
      success: true,
      message: 'Đã hủy tìm kiếm'
    };
  } catch (error) {
    console.error('Error in cancelQueue:', error);
    return {
      success: false,
      error: 'Lỗi hệ thống',
      errorCode: 'SYSTEM_ERROR'
    };
  }
}

/**
 * Get queue information
 * @returns {Object} - Queue info (size, users list)
 */
function getQueueInfo() {
  try {
    const users = matchQueue.getUsers();
    const now = Date.now();
    
    // Calculate wait time for each user
    const usersWithWaitTime = users.map(user => ({
      userId: user.userId,
      username: user.userInfo?.username,
      joinedAt: user.joinedAt,
      waitTime: Math.floor((now - new Date(user.joinedAt).getTime()) / 1000),
      interests: user.interestNames
    }));

    return {
      success: true,
      data: {
        size: matchQueue.getSize(),
        maxSize: MAX_QUEUE_SIZE,
        users: usersWithWaitTime,
        timeout: QUEUE_TIMEOUT
      }
    };
  } catch (error) {
    console.error('Error in getQueueInfo:', error);
    return {
      success: false,
      error: 'Lỗi hệ thống',
      errorCode: 'SYSTEM_ERROR'
    };
  }
}

/**
 * Handle timeout for users who have been waiting too long
 * @param {Object} io - Socket.IO instance for emitting events
 * @returns {Array} - Array of timed out user IDs
 */
function handleTimeout(io) {
  const timedOutUsers = [];
  
  try {
    const users = matchQueue.getUsers();
    const now = Date.now();
    
    for (const user of users) {
      const waitTime = Math.floor((now - new Date(user.joinedAt).getTime()) / 1000);
      
      if (waitTime >= QUEUE_TIMEOUT) {
        // Remove user from queue
        matchQueue.removeUser(user.userId);
        timedOutUsers.push(user.userId);
        
        // Emit timeout event to user if socket provided
        if (io && user.socketId) {
          io.to(user.socketId).emit('match:timeout', {
            waitedTime: waitTime,
            suggestion: 'Hãy thử mở rộng sở thích của bạn để tìm thấy người phù hợp hơn'
          });
        }
        
        console.log(`User ${user.userId} timed out after ${waitTime} seconds`);
      }
    }
    
    return timedOutUsers;
  } catch (error) {
    console.error('Error in handleTimeout:', error);
    return timedOutUsers;
  }
}

/**
 * Check if user is in queue
 * @param {number} userId - User ID
 * @returns {boolean}
 */
function isUserInQueue(userId) {
  return matchQueue.hasUser(userId);
}

/**
 * Get user from queue
 * @param {number} userId - User ID
 * @returns {Object|null}
 */
function getUserFromQueue(userId) {
  return matchQueue.getUser(userId);
}

/**
 * Reset timeout/heartbeat for a user
 * @param {number} userId - User ID
 * @returns {boolean}
 */
function resetUserTimeout(userId) {
  return matchQueue.resetTimeout(userId);
}

module.exports = {
  joinQueue,
  cancelQueue,
  getQueueInfo,
  handleTimeout,
  isUserInQueue,
  getUserFromQueue,
  resetUserTimeout,
  QUEUE_TIMEOUT,
  MAX_QUEUE_SIZE
};