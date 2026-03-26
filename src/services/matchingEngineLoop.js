const matchEngine = require('./matchEngine');
const matchService = require('./matchService');
const queueService = require('./queueService');

// Constants
const MATCHING_INTERVAL_MS = 2000;

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
    
    // ===== BƯỚC 1: LẤY THÔNG TIN ĐẦY ĐỦ CỦA USERS (bao gồm location, dob) =====
    const { getPool } = require('../config/db');
    const pool = getPool();
    
    const userIds = users.map(u => u.userId);
    const usersInfoQuery = await pool.query(
      'SELECT user_id, username, location, dob FROM users WHERE user_id = ANY($1)',
      [userIds]
    );
    
    const usersInfoMap = new Map();
    usersInfoQuery.rows.forEach(row => {
      usersInfoMap.set(row.user_id, row);
    });
    
    // ===== BƯỚC 1.5: LẤY DANH SÁCH CÁC CẶP ĐÃ MATCH =====
    console.log(`\n🔍 Checking existing matches for users: [${userIds.join(', ')}]`);
    const existingMatchesQuery = await pool.query(`
      SELECT user_one, user_two 
      FROM match_sessions 
      WHERE (user_one = ANY($1) OR user_two = ANY($1))
        AND status = 'active'
    `, [userIds]);
    
    const alreadyMatchedPairs = new Set();
    existingMatchesQuery.rows.forEach(row => {
      const pair1 = `${row.user_one}-${row.user_two}`;
      const pair2 = `${row.user_two}-${row.user_one}`;
      alreadyMatchedPairs.add(pair1);
      alreadyMatchedPairs.add(pair2);
    });
    
    console.log(`   📋 Found ${existingMatchesQuery.rows.length} existing match sessions`);
    if (existingMatchesQuery.rows.length > 0) {
      console.log(`   🚫 Already matched pairs:`, Array.from(alreadyMatchedPairs));
    }
    
    // Helper function: Kiểm tra 2 user đã match chưa
    const hasAlreadyMatched = (userId1, userId2) => {
      const pair = `${userId1}-${userId2}`;
      return alreadyMatchedPairs.has(pair);
    };
    
    // Helper function: Normalize location - Better version that removes accents/tones
    const normalizeLocation = (location) => {
      if (!location) return null;
      
      // Convert to lowercase, trim, and remove accents/tones
      let normalized = location.toLowerCase().trim()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/đ/g, "d"); // Special case for 'đ'
      
      // Common city names in Vietnam (accent-less)
      const cities = [
        'ha noi',
        'ho chi minh',
        'da nang',
        'hai phong',
        'can tho',
        'da lat',
        'hue',
        'nha trang',
        'vung tau',
        'bien hoa',
        'binh duong',
        'dong nai',
        'long an',
        'ba ria',
        'quang ninh',
        'ha long',
        'nam dinh',
        'thai binh',
        'nghe an',
        'thanh hoa',
        'quang binh',
        'quang tri'
      ];
      
      // Try to find city name in the location string
      for (const city of cities) {
        if (normalized.includes(city)) {
          return city;
        }
      }
      
      // Fallback: extract last part (city) and clean up
      const parts = normalized.split(',').map(p => p.trim());
      if (parts.length > 0) {
        let lastPart = parts[parts.length - 1];
        lastPart = lastPart.replace(/vietnam/g, '').replace(/tinh/g, '').replace(/thanh pho/g, '').replace(/tp/g, '').trim();
        return lastPart;
      }
      
      return normalized.replace(/\s+/g, ' ');
    };
    
    // Convert queue users to the format expected by matchEngine
    const usersForMatching = users.map(u => {
      const userInfo = usersInfoMap.get(u.userId);
      const normalizedLocation = normalizeLocation(userInfo?.location);
      
      // Calculate wait time in seconds
      const now = Date.now();
      const waitTime = Math.floor((now - new Date(u.joinedAt).getTime()) / 1000);
      
      return {
        userId: u.userId,
        joinedAt: u.joinedAt,
        waitTime,
        location: normalizedLocation,
        originalLocation: userInfo?.location || null,
        dob: userInfo?.dob || null
      };
    });
    
    console.log(`\n📍 Users with location info:`);
    usersForMatching.forEach((u, idx) => {
      console.log(`   ${idx + 1}. User ${u.userId}: location="${u.location}" (wait: ${u.waitTime}s), dob=${u.dob}`);
    });

    // ===== BƯỚC 2: TÌM MATCH ƯU TIÊN LOCATION =====
    let bestMatch = null;
    let candidatesToEvaluate = [];

    // Evaluate ALL pairs in the queue since N is small
    // This allows cross-location matching if no local matches are found
    for (let i = 0; i < usersForMatching.length; i++) {
      for (let j = i + 1; j < usersForMatching.length; j++) {
        const user1 = usersForMatching[i];
        const user2 = usersForMatching[j];

        if (hasAlreadyMatched(user1.userId, user2.userId)) {
          continue;
        }

        candidatesToEvaluate.push({ user1, user2 });
      }
    }

    if (candidatesToEvaluate.length === 0) {
      console.log(`❌ No valid unique pairs found in queue (or all already matched)`);
      console.log(`🔄 ========== MATCHING CYCLE END ==========\n`);
      return;
    }

    const evaluatedPairs = [];
    for (const { user1, user2 } of candidatesToEvaluate) {
      const sameLocation = user1.location === user2.location && user1.location !== null;
      
      // Calculate base score
      const matchResult = await matchingEngine.calculateMatchScore(user1, user2);
      
      // ===== LOCATION RULES =====
      // 1. Same location gets a 20% bonus
      // 2. Different location is ONLY allowed if at least one user has been waiting > 40s
      
      let finalScore = matchResult.score;
      if (sameLocation) {
        finalScore = Math.min(finalScore + 20, 100);
        console.log(`   🏠 [LOCAL] User ${user1.userId} <-> User ${user2.userId}: Base ${matchResult.score}% -> Bonus ${finalScore}%`);
      } else {
        const canCrossMatch = user1.waitTime > 40 || user2.waitTime > 40;
        if (!canCrossMatch) {
          console.log(`   ⏭️ [LOCATION] Skipping cross-match User ${user1.userId} (wait ${user1.waitTime}s) <-> User ${user2.userId} (wait ${user2.waitTime}s) - wait time too short`);
          continue;
        }
        console.log(`   🌍 [GLOBAL] User ${user1.userId} <-> User ${user2.userId}: Score ${finalScore}% (Cross-matching enabled for long wait)`);
      }

      evaluatedPairs.push({
        ...matchResult,
        finalScore,
        sameLocation
      });
    }

    if (evaluatedPairs.length === 0) {
      console.log(`❌ No pairs meeting criteria after evaluation`);
      console.log(`🔄 ========== MATCHING CYCLE END ==========\n`);
      return;
    }

    // Sort by finalScore descending
    evaluatedPairs.sort((a, b) => b.finalScore - a.finalScore);
    bestMatch = evaluatedPairs[0];
    const bestMatchLocation = bestMatch.sameLocation ? usersForMatching.find(u => u.userId === bestMatch.user1Id).location : 'MULTIPLE';


    console.log(`\n✅ BEST MATCH FOUND!`);
    console.log(`   Location: ${bestMatchLocation}`);
    console.log(`   User ${bestMatch.user1Id} <-> User ${bestMatch.user2Id}`);
    console.log(`   Score: ${bestMatch.finalScore}% (base: ${bestMatch.score}%)`);
    if (bestMatch.interestScore !== undefined) {
      console.log(`   Interest Score: ${bestMatch.interestScore}/70`);
    }
    if (bestMatch.numerologyScore !== undefined) {
      console.log(`   Numerology Score: ${bestMatch.numerologyScore}/30`);
    }
    console.log(`   Common interests: ${bestMatch.commonInterests?.length || 0}`);

    const { user1Id, user2Id } = bestMatch;

    // Get full user info from queue for socket emission
    const user1Data = queueService.getUserFromQueue(user1Id);
    const user2Data = queueService.getUserFromQueue(user2Id);

    if (!user1Data || !user2Data) {
      console.log('One or both users no longer in queue');
      return;
    }

    // Create match session with score
    const matchScore = Math.round(bestMatch.finalScore || 0); 
    const validScore = isNaN(matchScore) || matchScore < 0 ? 0 : matchScore;
    
    console.log(`Saved match with final score: ${validScore}`);
    
    const matchSession = await matchService.createMatchSession(
      user1Id, 
      user2Id, 
      'interest',
      validScore
    );


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
      score: bestMatch.finalScore,
      interestScore: bestMatch.finalScore,
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
      score: bestMatch.finalScore,
      interestScore: bestMatch.finalScore,
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