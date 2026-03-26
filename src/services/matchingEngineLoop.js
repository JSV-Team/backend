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

    // Helper function: Normalize location - Extract city name from full address
    const normalizeLocation = (location) => {
      if (!location) return null;

      // Convert to lowercase and trim
      let normalized = location.toLowerCase().trim();

      // Common city names in Vietnam
      const cities = [
        'hà nội',
        'tp. hồ chí minh',
        'tp.hồ chí minh',
        'hồ chí minh',
        'đà nẵng',
        'hải phòng',
        'cần thơ',
        'đà lạt',
        'huế',
        'nha trang',
        'vũng tàu',
        'biên hòa',
        'bình dương',
        'đồng nai',
        'long an',
        'bà rịa',
        'quảng ninh',
        'hạ long',
        'nam định',
        'thái bình',
        'nghệ an',
        'thanh hóa',
        'quảng bình',
        'quảng trị',
        'thừa thiên huế'
      ];

      // Try to find city name in the location string
      for (const city of cities) {
        if (normalized.includes(city)) {
          return city;
        }
      }

      // If no city found, try to extract from comma-separated address
      // Usually format: "Street, Ward, District, City"
      const parts = normalized.split(',').map(p => p.trim());
      if (parts.length > 0) {
        // Return the last part (usually the city)
        const lastPart = parts[parts.length - 1];
        // Remove "vietnam" if present
        return lastPart.replace(/vietnam/g, '').trim();
      }

      return normalized.replace(/\s+/g, ' ');
    };

    // Convert queue users to the format expected by matchEngine (với location và dob)
    const usersForMatching = users.map(u => {
      const userInfo = usersInfoMap.get(u.userId);
      const normalizedLocation = normalizeLocation(userInfo?.location);
      return {
        userId: u.userId,
        joinedAt: u.joinedAt,
        location: normalizedLocation,
        originalLocation: userInfo?.location || null,
        dob: userInfo?.dob || null
      };
    });

    console.log(`\n📍 Users with location info:`);
    usersForMatching.forEach((u, idx) => {
      console.log(`   ${idx + 1}. User ${u.userId}: location="${u.originalLocation}" (normalized: "${u.location}"), dob=${u.dob}`);
    });

    // ===== BƯỚC 2: LỌC THEO LOCATION - Nhóm users theo location =====
    const locationGroups = new Map();
    usersForMatching.forEach(user => {
      if (!user.location) {
        console.log(`   ⚠️  User ${user.userId} has no location - skipping`);
        return;
      }

      if (!locationGroups.has(user.location)) {
        locationGroups.set(user.location, []);
      }
      locationGroups.get(user.location).push(user);
    });

    console.log(`\n🗺️  Location groups (normalized):`);
    locationGroups.forEach((groupUsers, location) => {
      const originalLocations = groupUsers.map(u => u.originalLocation).join(', ');
      console.log(`   📍 "${location}": ${groupUsers.length} users - [${groupUsers.map(u => u.userId).join(', ')}]`);
      console.log(`      Original: [${originalLocations}]`);
    });

    // ===== BƯỚC 3: TÌM MATCH TRONG TỪNG NHÓM LOCATION (BỎ QUA ĐÃ MATCH) =====
    let bestMatch = null;
    let bestMatchLocation = null;

    for (const [location, groupUsers] of locationGroups.entries()) {
      if (groupUsers.length < 2) {
        console.log(`   ⏭️  Skipping location "${location}" - only ${groupUsers.length} user(s)`);
        continue;
      }

      console.log(`\n🔍 Finding best match in location "${location}" (${groupUsers.length} users)...`);

      // Lọc bỏ các cặp đã match
      const validPairs = [];
      for (let i = 0; i < groupUsers.length; i++) {
        for (let j = i + 1; j < groupUsers.length; j++) {
          const user1 = groupUsers[i];
          const user2 = groupUsers[j];

          if (hasAlreadyMatched(user1.userId, user2.userId)) {
            console.log(`   🚫 Skipping pair User ${user1.userId} <-> User ${user2.userId} (already matched)`);
            continue;
          }

          validPairs.push([user1, user2]);
        }
      }

      if (validPairs.length === 0) {
        console.log(`   ❌ No valid pairs in "${location}" (all pairs already matched)`);
        continue;
      }

      console.log(`   ✅ Found ${validPairs.length} valid pair(s) to evaluate`);

      // Tìm match tốt nhất trong các cặp hợp lệ
      let bestMatchInGroup = null;
      let bestScoreInGroup = -1;

      for (const [user1, user2] of validPairs) {
        const matchResult = await matchingEngine.calculateMatchScore(user1, user2);

        console.log(`   🧮 User ${user1.userId} <-> User ${user2.userId}: Score ${matchResult.score}%`);

        if (matchResult.score > matchingEngine.minScoreThreshold && matchResult.score > bestScoreInGroup) {
          bestScoreInGroup = matchResult.score;
          bestMatchInGroup = matchResult;
        }
      }

      if (bestMatchInGroup) {
        console.log(`   ✅ Best match in "${location}": User ${bestMatchInGroup.user1Id} <-> User ${bestMatchInGroup.user2Id} (Score: ${bestMatchInGroup.score}%)`);

        // Lưu match tốt nhất (có thể so sánh score nếu có nhiều nhóm)
        if (!bestMatch || bestMatchInGroup.score > bestMatch.score) {
          bestMatch = bestMatchInGroup;
          bestMatchLocation = location;
        }
      } else {
        console.log(`   ❌ No valid match in "${location}" (no pairs meet threshold)`);
      }
    }

    if (!bestMatch) {
      console.log(`\n❌ No valid match found in any location group`);
      console.log(`💡 Tip: Users need to be in the same location and have common interests`);
      console.log(`🔄 ========== MATCHING CYCLE END ==========\n`);
      return; // No valid match found
    }

    console.log(`\n✅ BEST MATCH FOUND!`);
    console.log(`   Location: ${bestMatchLocation}`);
    console.log(`   User ${bestMatch.user1Id} <-> User ${bestMatch.user2Id}`);
    console.log(`   Score: ${bestMatch.score}%`);
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
    const matchScore = Math.round(bestMatch.score || 0);  // Use .score not .totalScore
    const validScore = isNaN(matchScore) || matchScore < 0 ? 0 : matchScore;

    console.log(`💾 Saving match with score: ${validScore} (original: ${bestMatch.score})`);

    const matchSession = await matchService.createMatchSession(
      user1Id,
      user2Id,
      'interest',
      validScore  // Save validated match score
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
      score: bestMatch.score,
      interestScore: bestMatch.score,  // Add for compatibility
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
      interestScore: bestMatch.score,  // Add for compatibility
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