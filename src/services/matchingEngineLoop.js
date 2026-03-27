const matchEngine = require('./matchEngine');
const matchService = require('./matchService');
const queueService = require('./queueService');

// Constants for matching behavior
const MATCHING_INTERVAL_MS = 5000; // 5 seconds for more responsive matching

// Singleton matching engine instance
const matchingEngine = new matchEngine();

let matchingInterval = null;
let ioInstance = null;

// ===== VERSION CHECK =====
console.log('🔥🔥🔥 [LOADED] matchingEngineLoop.js - VERSION 2.0 - WITH LOCATION FILTER & ALREADY MATCHED CHECK 🔥🔥🔥');

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

    const users = queueInfo.data.users; // Define users here

    if (!queueInfo.success || users.length < 2) {
      console.log(`⏭️  Skipping cycle - not enough users (need at least 1 more, current: ${users.length})`);
      console.log(`🔄 ========== MATCHING CYCLE END ==========\n`);
      return; // Not enough users to match
    }

    console.log(`\n👥 Users in queue (${users.length}):`);
    users.forEach(u => console.log(`   - User ${u.userId}${u.username ? ` (${u.username})` : ''} at ${u.location || 'Unknown'}`));

    // ===== BƯỚC 1: LẤY THÔNG TIN ĐẦY ĐỦ CỦA USERS (bao gồm location, dob, coordinates) =====
    const { getPool } = require('../config/db');
    const pool = getPool();

    const userIds = users.map(u => u.userId);
    const usersInfoQuery = await pool.query(
      'SELECT user_id, username, location, dob, latitude, longitude FROM users WHERE user_id = ANY($1)',
      [userIds]
    );

    const usersInfoMap = new Map();
    usersInfoQuery.rows.forEach(row => {
      usersInfoMap.set(row.user_id, row);
    });

    // ===== LẤY DANH SÁCH CÁC CẶP ĐÃ MATCH =====
    const existingMatchesQuery = await pool.query(`
      SELECT user_one, user_two 
      FROM match_sessions 
      WHERE (user_one = ANY($1) OR user_two = ANY($1))
        AND status = 'active'
    `, [userIds]);

    const alreadyMatchedSet = new Set();
    existingMatchesQuery.rows.forEach(row => {
      const u1 = Math.min(row.user_one, row.user_two);
      const u2 = Math.max(row.user_one, row.user_two);
      alreadyMatchedSet.add(`${u1}-${u2}`);
    });

    const hasAlreadyMatched = (id1, id2) => {
      const u1 = Math.min(id1, id2);
      const u2 = Math.max(id1, id2);
      return alreadyMatchedSet.has(`${u1}-${u2}`);
    };

    // Merge queue info with DB info
    const usersForMatching = users.map(u => {
      const info = usersInfoMap.get(Number(u.userId));
      if (!info) {
        console.log(`⚠️  User ${u.userId} in queue but not found in DB info map`);
        return null;
      }
      
      return {
        ...u,
        location: info.location,
        latitude: info.latitude,
        longitude: info.longitude,
        dob: info.dob,
        username: info.username,
        user_id: info.user_id,
        userId: info.user_id // Ensure consistency
      };
    }).filter(Boolean);

    console.log(`\n📍 Users with location info: ${usersForMatching.length}`);
    usersForMatching.forEach((u, idx) => {
      console.log(`   ${idx + 1}. User ${u.userId} (${u.username}): loc="${u.location}", coords=(${u.latitude}, ${u.longitude})`);
    });

    if (usersForMatching.length < 2) {
      console.log(`⏭️  Skipping matching - not enough valid users (need 2, have ${usersForMatching.length})`);
      return;
    }

    // ===== BƯỚC 2: TÌM MATCH TRÊN TOÀN BỘ QUEUE (ƯU TIÊN KHOẢNG CÁCH) =====
    console.log(`\n🔍 Finding best match among all ${usersForMatching.length} users in queue...`);
    
    // Tạo danh sách các cặp hợp lệ (chưa match với nhau)
    const validPairs = [];
    
    for (let i = 0; i < usersForMatching.length; i++) {
      for (let j = i + 1; j < usersForMatching.length; j++) {
        const user1 = usersForMatching[i];
        const user2 = usersForMatching[j];

        if (hasAlreadyMatched(user1.userId, user2.userId)) {
          console.log(`   🚫 Skipping pair User ${user1.userId} <-> User ${user2.userId} (already matched)`);
          continue;
        }
        
        validPairs.push([user1, user2]);
      }
    }

    if (validPairs.length === 0) {
      console.log(`   ❌ No valid pairs in queue (all pairs already matched or not enough users)`);
      console.log(`🔄 ========== MATCHING CYCLE END ==========\n`);
      return;
    }

    console.log(`   ✅ Found ${validPairs.length} valid pair(s) to evaluate`);

    let bestMatch = null;

    for (const [user1, user2] of validPairs) {
      const matchResult = await matchingEngine.calculateMatchScore(user1, user2);
      
      console.log(`   🧮 User ${user1.userId} <-> User ${user2.userId}: Score ${matchResult.score}%`);
      
      const distInfo = matchResult.breakdown?.distance;
      if (distInfo) {
        console.log(`      Breakdown: Distance=${distInfo.score} (${distInfo.km}km)`);
      }

      if (matchResult.score > matchingEngine.minScoreThreshold) {
        if (!bestMatch || matchResult.score > bestMatch.score) {
          bestMatch = matchResult;
        }
      }
    }

    if (!bestMatch) {
      console.log(`\n❌ No valid match found (no pairs meet threshold)`);
      console.log(`🔄 ========== MATCHING CYCLE END ==========\n`);
      return;
    }

    console.log(`\n✅ BEST MATCH FOUND!`);
    console.log(`   User ${bestMatch.user1Id} <-> User ${bestMatch.user2Id}`);
    console.log(`   Score: ${bestMatch.score}%`);
    
    // Save match session and notify users
    const { user1Id, user2Id } = bestMatch;
    const user1Data = queueService.getUserFromQueue(user1Id);
    const user2Data = queueService.getUserFromQueue(user2Id);

    if (!user1Data || !user2Data) {
      console.log('One or both users no longer in queue');
      return;
    }

    const validScore = Math.max(0, Math.round(bestMatch.score || 0));
    const matchSession = await matchService.createMatchSession(user1Id, user2Id, 'distance', validScore);
    const conversationId = await matchService.createConversation(user1Id, user2Id);

    // Remove from queue
    queueService.cancelQueue(user1Id);
    queueService.cancelQueue(user2Id);

    // Emit events
    const emitData = (uId, matchedUId, matchedData) => ({
      matchId: matchSession.match_id,
      conversationId,
      matchedUser: {
        user_id: matchedUId,
        username: matchedData.userInfo?.username,
        full_name: matchedData.userInfo?.full_name,
        avatar_url: matchedData.userInfo?.avatar_url,
        bio: matchedData.userInfo?.bio
      },
      score: bestMatch.score,
      interestScore: bestMatch.score, // Compatibility
      commonInterests: bestMatch.commonInterests
    });

    if (ioInstance) {
      if (user1Data.socketId) ioInstance.to(user1Data.socketId).emit('match:found', emitData(user1Id, user2Id, user2Data));
      if (user2Data.socketId) ioInstance.to(user2Data.socketId).emit('match:found', emitData(user2Id, user1Id, user1Data));
    }

    console.log(`\n🎉 Match successfully created and emitted!`);
    console.log(`🔄 ========== MATCHING CYCLE END ==========\n`);

  } catch (error) {
    console.error('\n❌ ERROR in matching cycle:', error);
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