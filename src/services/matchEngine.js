const interestService = require('./interestService');
const matchingService = require('./matchingService');
const { pool } = require('../config/db');

/**
 * MatchingEngine - Core matching algorithm for interest-based matching
 * NÂNG CẤP: Tích hợp Phễu 3 Tầng (Location + Interest 70% + Numerology 30%)
 * Implements scoring logic with wait time bonus and minimum score threshold
 */
class MatchingEngine {
  constructor(options = {}) {
    this.minScoreThreshold = options.minScoreThreshold || 0;
    this.waitTimeBonusWeight = options.waitTimeBonusWeight || 0.1;
    this.useEnhancedMatching = options.useEnhancedMatching !== false; // Mặc định bật
  }

  /**
   * Calculate match score between two users
   * NÂNG CẤP: Sử dụng matchingService với Phễu 3 Tầng (bao gồm distance)
   * @param {Object} user1 - First user object (phải có userId, location, dob, latitude, longitude)
   * @param {Object} user2 - Second user object (phải có userId, location, dob, latitude, longitude)
   * @returns {Promise<Object>} - Match result with score and details
   */
  async calculateMatchScore(user1, user2) {
    // Nếu bật Enhanced Matching, sử dụng Phễu 3 Tầng
    if (this.useEnhancedMatching) {
      console.log(`\n🚀 [MatchEngine] Using ENHANCED matching (3-Tier Funnel with Distance)`);
      
      // Lấy thông tin đầy đủ của user từ database nếu thiếu
      const user1Data = await this._getUserFullData(user1);
      const user2Data = await this._getUserFullData(user2);
      
      // Tính điểm theo Phễu 3 Tầng (bao gồm distance)
      const enhancedResult = await matchingService.calculateTotalMatchScore(
        user1Data.userId,
        user2Data.userId,
        user1Data.dob,
        user2Data.dob,
        user1Data.latitude,
        user1Data.longitude,
        user2Data.latitude,
        user2Data.longitude
      );
      
      // Calculate wait time bonus
      const now = new Date();
      const user1WaitTime = (now - new Date(user1.joinedAt)) / 1000;
      const user2WaitTime = (now - new Date(user2.joinedAt)) / 1000;
      const maxWaitTime = Math.max(user1WaitTime, user2WaitTime);
      const normalizedWaitTime = Math.min(maxWaitTime / 120, 1);
      const waitTimeBonus = normalizedWaitTime * this.waitTimeBonusWeight * 100;
      
      // Tổng điểm = Enhanced Score + Wait Time Bonus
      const totalScore = Math.min(enhancedResult.totalScore + waitTimeBonus, 100);
      
      return {
        user1Id: user1.userId,
        user2Id: user2.userId,
        score: Math.round(totalScore * 100) / 100,
        interestScore: enhancedResult.interestScore,
        numerologyScore: enhancedResult.numerologyScore,
        distance: enhancedResult.distance,
        waitTimeBonus: Math.round(waitTimeBonus * 100) / 100,
        commonInterests: enhancedResult.commonInterests,
        breakdown: enhancedResult.breakdown,
        matchingType: 'enhanced' // Đánh dấu là enhanced matching
      };
    }
    
    // ===== LOGIC CŨ (Fallback) =====
    console.log(`\n📊 [MatchEngine] Using LEGACY matching (Interest only)`);
    
    // Use interestService to calculate base interest score
    const interestScore = await interestService.calculateInterestScore(
      user1.userId,
      user2.userId
    );

    // If no common interests, return score 0 (below threshold)
    if (interestScore === 0) {
      return {
        user1Id: user1.userId,
        user2Id: user2.userId,
        score: 0,
        interestScore: 0,
        waitTimeBonus: 0,
        commonInterests: [],
        totalUniqueInterests: 0,
        matchingType: 'legacy'
      };
    }

    // Calculate wait time bonus
    const now = new Date();
    const user1WaitTime = (now - new Date(user1.joinedAt)) / 1000; // in seconds
    const user2WaitTime = (now - new Date(user2.joinedAt)) / 1000;
    const maxWaitTime = Math.max(user1WaitTime, user2WaitTime);

    // Normalize wait time bonus (max 120 seconds = full bonus)
    const normalizedWaitTime = Math.min(maxWaitTime / 120, 1);
    const waitTimeBonus = normalizedWaitTime * this.waitTimeBonusWeight * 100;

    // Total score = interest score + wait time bonus
    const totalScore = Math.min(interestScore + waitTimeBonus, 100);

    // Get common interests for display
    const commonInterests = await interestService.getCommonInterests(
      user1.userId,
      user2.userId
    );

    // Get total unique interests
    const user1Interests = await interestService.getUserInterests(user1.userId);
    const user2Interests = await interestService.getUserInterests(user2.userId);
    const allInterests = new Set([
      ...user1Interests.map(i => i.interest_id),
      ...user2Interests.map(i => i.interest_id),
    ]);

    return {
      user1Id: user1.userId,
      user2Id: user2.userId,
      score: Math.round(totalScore * 100) / 100,
      interestScore: Math.round(interestScore * 100) / 100,
      waitTimeBonus: Math.round(waitTimeBonus * 100) / 100,
      commonInterests,
      totalUniqueInterests: allInterests.size,
      matchingType: 'legacy'
    };
  }
  
  /**
   * Helper: Lấy thông tin đầy đủ của user từ database
   * @private
   */
  async _getUserFullData(user) {
    // Nếu đã có đủ thông tin, return luôn
    if (user.dob && user.location && user.latitude !== undefined && user.longitude !== undefined) {
      return user;
    }
    
    // Query database để lấy thông tin đầy đủ
    const result = await pool.query(
      'SELECT user_id, username, location, dob, latitude, longitude FROM users WHERE user_id = $1',
      [user.userId]
    );
    
    if (result.rows.length === 0) {
      throw new Error(`User ${user.userId} not found in database`);
    }
    
    return {
      ...user,
      userId: result.rows[0].user_id,
      location: result.rows[0].location,
      dob: result.rows[0].dob,
      latitude: result.rows[0].latitude,
      longitude: result.rows[0].longitude
    };
  }

  /**
   * Find the best match pair from a list of users
   * Prioritizes by score (interest + wait time bonus), then by wait time
   * @param {Array} users - Array of user objects in the queue
   * @returns {Promise<Object|null>} - Best match pair or null if no valid match
   */
  async findBestMatch(users) {
    console.log(`\n🔎 [MatchEngine] findBestMatch called with ${users?.length || 0} users`);
    
    if (!users || users.length < 2) {
      console.log(`   ⚠️  Not enough users to match (need at least 2)`);
      return null;
    }

    const validPairs = [];
    let totalPairsEvaluated = 0;

    // Evaluate all possible pairs
    for (let i = 0; i < users.length; i++) {
      for (let j = i + 1; j < users.length; j++) {
        const user1 = users[i];
        const user2 = users[j];

        // Skip self-matching
        if (user1.userId === user2.userId) {
          continue;
        }

        totalPairsEvaluated++;
        
        // Calculate match score
        console.log(`   🧮 Evaluating pair: User ${user1.userId} <-> User ${user2.userId}`);
        const matchResult = await this.calculateMatchScore(user1, user2);
        console.log(`      Score: ${matchResult.score}% (interest: ${matchResult.interestScore}%, wait bonus: ${matchResult.waitTimeBonus}%)`);
        console.log(`      Common interests: ${matchResult.commonInterests?.length || 0}, Threshold: ${this.minScoreThreshold}%`);

        // Only consider pairs that meet minimum score threshold
        if (matchResult.score > this.minScoreThreshold) {
          console.log(`      ✅ Pair meets threshold!`);
          validPairs.push(matchResult);
        } else {
          console.log(`      ❌ Pair below threshold (${matchResult.score}% <= ${this.minScoreThreshold}%)`);
        }
      }
    }

    console.log(`\n   📊 Evaluation complete:`);
    console.log(`      Total pairs evaluated: ${totalPairsEvaluated}`);
    console.log(`      Valid pairs found: ${validPairs.length}`);

    if (validPairs.length === 0) {
      console.log(`   ❌ No valid pairs found\n`);
      return null;
    }

    // Sort by score (descending), then by distance (ascending - closer is better), then by wait time (descending)
    validPairs.sort((a, b) => {
      // First by score
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      // Then by distance (closer is better) - only for enhanced matching
      if (a.matchingType === 'enhanced' && b.matchingType === 'enhanced') {
        // Handle null distances (put them at the end)
        if (a.distance === null && b.distance === null) {
          return b.waitTimeBonus - a.waitTimeBonus;
        }
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        
        // If distances are different, prioritize closer
        if (a.distance !== b.distance) {
          return a.distance - b.distance;
        }
      }
      // Finally by wait time bonus (users waiting longer get priority)
      return b.waitTimeBonus - a.waitTimeBonus;
    });

    console.log(`   🏆 Best match selected: User ${validPairs[0].user1Id} <-> User ${validPairs[0].user2Id} (${validPairs[0].score}%)\n`);
    return validPairs[0];
  }

  /**
   * Find multiple best match pairs from the queue
   * Useful for batch processing
   * @param {Array} users - Array of user objects in the queue
   * @param {number} maxPairs - Maximum number of pairs to return
   * @returns {Promise<Array>} - Array of best match pairs
   */
  async findBestMatches(users, maxPairs = 10) {
    if (!users || users.length < 2) {
      return [];
    }

    const allPairs = [];

    // Evaluate all possible pairs
    for (let i = 0; i < users.length; i++) {
      for (let j = i + 1; j < users.length; j++) {
        const user1 = users[i];
        const user2 = users[j];

        if (user1.userId === user2.userId) {
          continue;
        }

        const matchResult = await this.calculateMatchScore(user1, user2);

        if (matchResult.score > this.minScoreThreshold) {
          allPairs.push(matchResult);
        }
      }
    }

    if (allPairs.length === 0) {
      return [];
    }

    // Sort by score descending
    allPairs.sort((a, b) => b.score - a.score);

    // Return top pairs, ensuring no user appears in multiple pairs
    const matchedUserIds = new Set();
    const result = [];

    for (const pair of allPairs) {
      if (
        !matchedUserIds.has(pair.user1Id) &&
        !matchedUserIds.has(pair.user2Id)
      ) {
        result.push(pair);
        matchedUserIds.add(pair.user1Id);
        matchedUserIds.add(pair.user2Id);

        if (result.length >= maxPairs) {
          break;
        }
      }
    }

    return result;
  }

  /**
   * Get match statistics for a list of users
   * @param {Array} users - Array of user objects
   * @returns {Promise<Object>} - Statistics object
   */
  async getMatchStats(users) {
    if (!users || users.length < 2) {
      return {
        totalPairs: 0,
        validPairs: 0,
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0,
      };
    }

    const scores = [];

    for (let i = 0; i < users.length; i++) {
      for (let j = i + 1; j < users.length; j++) {
        if (users[i].userId === users[j].userId) {
          continue;
        }

        const matchResult = await this.calculateMatchScore(users[i], users[j]);
        scores.push(matchResult.score);
      }
    }

    const validScores = scores.filter(s => s > this.minScoreThreshold);

    return {
      totalPairs: scores.length,
      validPairs: validScores.length,
      averageScore: validScores.length > 0
        ? Math.round((validScores.reduce((a, b) => a + b, 0) / validScores.length) * 100) / 100
        : 0,
      highestScore: validScores.length > 0 ? Math.max(...validScores) : 0,
      lowestScore: validScores.length > 0 ? Math.min(...validScores) : 0,
    };
  }
}

module.exports = MatchingEngine;