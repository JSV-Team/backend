const matchEngine = require('./matchEngine');
const matchService = require('./matchService');
const queueService = require('./queueService');

// Constants
const MATCHING_INTERVAL_MS = 2000;

// Singleton matching engine instance
const matchingEngine = new matchEngine();

let matchingInterval = null;
let ioInstance = null;

/**
 * Start the matching engine loop
 * Runs every 2 seconds to find and create matches
 * @param {Object} io - Socket.IO instance for emitting events
 */
function startMatchingEngine(io) {
  if (matchingInterval) {
    console.log('Matching engine is already running');
    return;
  }

  ioInstance = io;
  console.log('Starting matching engine...');

  // Run matching immediately on start
  runMatchingCycle();

  // Then run every 2 seconds
  matchingInterval = setInterval(() => {
    runMatchingCycle();
  }, MATCHING_INTERVAL_MS);

  console.log(`Matching engine started with interval: ${MATCHING_INTERVAL_MS}ms`);
}

/**
 * Stop the matching engine loop
 */
function stopMatchingEngine() {
  if (matchingInterval) {
    clearInterval(matchingInterval);
    matchingInterval = null;
    ioInstance = null;
    console.log('Matching engine stopped');
  }
}

/**
 * Run a single matching cycle
 * Gets users from queue, finds best match, creates session and conversation
 */
async function runMatchingCycle() {
  try {
    // Get users from queue
    const queueInfo = queueService.getQueueInfo();
    if (!queueInfo.success || queueInfo.data.size < 2) {
      return; // Not enough users to match
    }

    const users = queueInfo.data.users;
    
    // Convert queue users to the format expected by matchEngine
    const usersForMatching = users.map(u => ({
      userId: u.userId,
      joinedAt: u.joinedAt
    }));

    // Find best match pair
    const bestMatch = await matchingEngine.findBestMatch(usersForMatching);
    
    if (!bestMatch) {
      return; // No valid match found
    }

    const { user1Id, user2Id } = bestMatch;

    // Get full user info from queue for socket emission
    const user1Data = queueService.getUserFromQueue(user1Id);
    const user2Data = queueService.getUserFromQueue(user2Id);

    if (!user1Data || !user2Data) {
      console.log('One or both users no longer in queue');
      return;
    }

    // Create match session
    const matchSession = await matchService.createMatchSession(user1Id, user2Id, 'interest');

    // Create conversation
    const conversationId = await matchService.createConversation(user1Id, user2Id);

    // Remove users from queue
    queueService.cancelQueue(user1Id);
    queueService.cancelQueue(user2Id);

    // Emit match:found events to both users
    const matchData = {
      matchId: matchSession.match_id,
      conversationId: conversationId,
      matchedUser: {
        userId: user2Id,
        username: user2Data.userInfo?.username,
        fullName: user2Data.userInfo?.full_name,
        avatarUrl: user2Data.userInfo?.avatar_url,
        bio: user2Data.userInfo?.bio
      },
      score: bestMatch.score,
      commonInterests: bestMatch.commonInterests
    };

    const matchData1 = {
      matchId: matchSession.match_id,
      conversationId: conversationId,
      matchedUser: {
        userId: user1Id,
        username: user1Data.userInfo?.username,
        fullName: user1Data.userInfo?.full_name,
        avatarUrl: user1Data.userInfo?.avatar_url,
        bio: user1Data.userInfo?.bio
      },
      score: bestMatch.score,
      commonInterests: bestMatch.commonInterests
    };

    // Emit to user1
    if (user1Data.socketId && ioInstance) {
      ioInstance.to(user1Data.socketId).emit('match:found', matchData);
    }

    // Emit to user2
    if (user2Data.socketId && ioInstance) {
      ioInstance.to(user2Data.socketId).emit('match:found', matchData1);
    }

    console.log(`Match created: User ${user1Id} <-> User ${user2Id}, Score: ${bestMatch.score}`);

  } catch (error) {
    console.error('Error in matching cycle:', error);
  }
}

/**
 * Get matching engine status
 * @returns {Object} Status object
 */
function getStatus() {
  return {
    isRunning: matchingInterval !== null,
    intervalMs: MATCHING_INTERVAL_MS,
    queueInfo: queueService.getQueueInfo()
  };
}

module.exports = {
  startMatchingEngine,
  stopMatchingEngine,
  runMatchingCycle,
  getStatus,
  MATCHING_INTERVAL_MS
};