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
    
    console.log(`\n🔄 ========== MATCHING CYCLE START ==========`);
    console.log(`📊 Queue size: ${queueInfo.data?.size || 0}`);
    
    if (!queueInfo.success || queueInfo.data.size < 2) {
      console.log(`⏭️  Skipping cycle - not enough users (need at least 2)`);
      console.log(`🔄 ========== MATCHING CYCLE END ==========\n`);
      return; // Not enough users to match
    }

    const users = queueInfo.data.users;
    console.log(`\n👥 Users in queue (${users.length}):`);
    users.forEach((u, idx) => {
      console.log(`   ${idx + 1}. User ${u.userId}: ${u.interests?.length || 0} interests - [${u.interests?.join(', ') || 'none'}]`);
    });
    
    // Convert queue users to the format expected by matchEngine
    const usersForMatching = users.map(u => ({
      userId: u.userId,
      joinedAt: u.joinedAt
    }));

    // Find best match pair
    console.log(`\n🔍 Finding best match among ${usersForMatching.length} users...`);
    const bestMatch = await matchingEngine.findBestMatch(usersForMatching);
    
    if (!bestMatch) {
      console.log(`❌ No valid match found (no pairs meet minimum score threshold)`);
      console.log(`💡 Tip: Check if users have common interests`);
      console.log(`🔄 ========== MATCHING CYCLE END ==========\n`);
      return; // No valid match found
    }

    console.log(`\n✅ MATCH FOUND!`);
    console.log(`   User ${bestMatch.user1Id} <-> User ${bestMatch.user2Id}`);
    console.log(`   Score: ${bestMatch.score}%`);
    console.log(`   Common interests: ${bestMatch.commonInterests?.length || 0}`);

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
        user_id: user2Id,
        username: user2Data.userInfo?.username,
        full_name: user2Data.userInfo?.full_name,
        avatar_url: user2Data.userInfo?.avatar_url,
        bio: user2Data.userInfo?.bio
      },
      score: bestMatch.score,
      commonInterests: bestMatch.commonInterests
    };

    const matchData1 = {
      matchId: matchSession.match_id,
      conversationId: conversationId,
      matchedUser: {
        user_id: user1Id,
        username: user1Data.userInfo?.username,
        full_name: user1Data.userInfo?.full_name,
        avatar_url: user1Data.userInfo?.avatar_url,
        bio: user1Data.userInfo?.bio
      },
      score: bestMatch.score,
      commonInterests: bestMatch.commonInterests
    };

    console.log(`📤 Emitting match:found to user ${user1Id}:`, {
      matchedUser: matchData.matchedUser.username,
      avatar_url: matchData.matchedUser.avatar_url
    });
    console.log(`📤 Emitting match:found to user ${user2Id}:`, {
      matchedUser: matchData1.matchedUser.username,
      avatar_url: matchData1.matchedUser.avatar_url
    });

    // Emit to user1
    if (user1Data.socketId && ioInstance) {
      ioInstance.to(user1Data.socketId).emit('match:found', matchData);
    }

    // Emit to user2
    if (user2Data.socketId && ioInstance) {
      ioInstance.to(user2Data.socketId).emit('match:found', matchData1);
    }

    console.log(`\n🎉 Match successfully created and emitted to both users!`);
    console.log(`🔄 ========== MATCHING CYCLE END ==========\n`);

  } catch (error) {
    console.error('\n❌ ERROR in matching cycle:', error);
    console.error('Stack trace:', error.stack);
    console.log(`🔄 ========== MATCHING CYCLE END (WITH ERROR) ==========\n`);
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