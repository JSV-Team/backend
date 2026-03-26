const { pool } = require('../config/db');
const interestService = require('./interestService');
const numerologyService = require('./numerologyService');

/**
 * MatchingService - Service nâng cấp với Phễu 3 Tầng
 * Tầng 0: Lọc an toàn (SQL)
 * Tầng 1: Lọc vị trí (SQL)
 * Tầng 2: Điểm sở thích (70%)
 * Tầng 3: Điểm thần số học (30%)
 */

/**
 * Lấy danh sách ứng viên phù hợp cho matching
 * Áp dụng Tầng 0 và Tầng 1 trong SQL query
 * @param {number} currentUserId - ID của user hiện tại
 * @param {string} currentUserLocation - Vị trí của user hiện tại
 * @returns {Promise<Array>} - Danh sách user phù hợp
 */
async function getCandidateUsers(currentUserId, currentUserLocation) {
  console.log(`\n🔍 [MatchingService] Getting candidates for User ${currentUserId} in location: ${currentUserLocation}`);
  
  const query = `
    SELECT 
      u.user_id,
      u.username,
      u.full_name,
      u.avatar_url,
      u.location,
      u.dob
    FROM users u
    WHERE 
      -- Tầng 0: Lọc an toàn
      u.user_id != $1                           -- Bỏ qua chính mình
      AND u.status != 'banned'                  -- Bỏ qua user bị banned
      AND NOT EXISTS (                          -- Bỏ qua user đã match
        SELECT 1 FROM match_sessions ms
        WHERE (ms.user_one = $1 AND ms.user_two = u.user_id)
           OR (ms.user_one = u.user_id AND ms.user_two = $1)
      )
      -- Tầng 1: Lọc vị trí (cùng thành phố)
      AND u.location = $2
    ORDER BY u.user_id
  `;
  
  const result = await pool.query(query, [currentUserId, currentUserLocation]);
  
  console.log(`   ✅ Found ${result.rows.length} candidate users`);
  return result.rows;
}

/**
 * Tính điểm matching tổng hợp cho 2 user
 * Tầng 2: Điểm sở thích (70%)
 * Tầng 3: Điểm thần số học (30%)
 * @param {number} userId1 - ID user thứ nhất
 * @param {number} userId2 - ID user thứ hai
 * @param {Date|string} dob1 - Ngày sinh user 1
 * @param {Date|string} dob2 - Ngày sinh user 2
 * @returns {Promise<Object>} - Kết quả matching với điểm số chi tiết
 */
async function calculateTotalMatchScore(userId1, userId2, dob1, dob2) {
  console.log(`\n🧮 [MatchingService] Calculating total match score`);
  console.log(`   User ${userId1} <-> User ${userId2}`);
  
  // ===== TẦNG 2: ĐIỂM SỞ THÍCH (70%) =====
  console.log(`\n   📊 TẦNG 2: Calculating Interest Score (max 70 points)`);
  
  // Sử dụng logic cũ từ interestService
  const rawInterestScore = await interestService.calculateInterestScore(userId1, userId2);
  
  // Quy đổi về thang điểm 70
  const interestScore = (rawInterestScore / 100) * 70;
  console.log(`   📈 Interest Score: ${interestScore.toFixed(2)}/70 (raw: ${rawInterestScore.toFixed(2)}%)`);
  
  // Lấy sở thích chung để hiển thị
  const commonInterests = await interestService.getCommonInterests(userId1, userId2);
  
  // ===== TẦNG 3: ĐIỂM THẦN SỐ HỌC (30%) =====
  console.log(`\n   🔮 TẦNG 3: Calculating Numerology Score (max 30 points)`);
  
  // Tính Life Path Number cho cả 2 user
  console.log(`   User ${userId1}:`);
  const lifePathNum1 = numerologyService.getLifePathNumber(dob1);
  
  console.log(`   User ${userId2}:`);
  const lifePathNum2 = numerologyService.getLifePathNumber(dob2);
  
  // Tính điểm thần số học
  const numerologyScore = numerologyService.calculateNumerologyScore(lifePathNum1, lifePathNum2);
  console.log(`   🌟 Numerology Score: ${numerologyScore}/30`);
  
  // ===== TỔNG KẾT =====
  const totalScore = interestScore + numerologyScore;
  
  console.log(`\n   🎯 TOTAL MATCH SCORE: ${totalScore.toFixed(2)}/100`);
  console.log(`      - Interest (70%): ${interestScore.toFixed(2)}`);
  console.log(`      - Numerology (30%): ${numerologyScore}`);
  console.log(`      - Common interests: ${commonInterests.length}`);
  
  return {
    userId1,
    userId2,
    totalScore: Math.round(totalScore * 100) / 100,
    interestScore: Math.round(interestScore * 100) / 100,
    numerologyScore,
    lifePathNum1,
    lifePathNum2,
    commonInterests,
    breakdown: {
      interest: {
        score: Math.round(interestScore * 100) / 100,
        weight: '70%',
        rawScore: Math.round(rawInterestScore * 100) / 100
      },
      numerology: {
        score: numerologyScore,
        weight: '30%',
        lifePathNumbers: [lifePathNum1, lifePathNum2]
      }
    }
  };
}

/**
 * Tìm người phù hợp nhất cho user hiện tại
 * @param {number} currentUserId - ID của user hiện tại
 * @returns {Promise<Object|null>} - Thông tin người phù hợp nhất hoặc null
 */
async function findBestMatchForUser(currentUserId) {
  console.log(`\n🎯 [MatchingService] Finding best match for User ${currentUserId}`);
  
  // Lấy thông tin user hiện tại
  const currentUserQuery = await pool.query(
    'SELECT user_id, username, full_name, location, dob FROM users WHERE user_id = $1',
    [currentUserId]
  );
  
  if (currentUserQuery.rows.length === 0) {
    console.log(`   ❌ User ${currentUserId} not found`);
    return null;
  }
  
  const currentUser = currentUserQuery.rows[0];
  console.log(`   👤 Current user: ${currentUser.username} (${currentUser.location})`);
  
  // Lấy danh sách ứng viên (đã lọc Tầng 0 và Tầng 1)
  const candidates = await getCandidateUsers(currentUserId, currentUser.location);
  
  if (candidates.length === 0) {
    console.log(`   ❌ No candidates found`);
    return null;
  }
  
  console.log(`\n   📋 Evaluating ${candidates.length} candidates...`);
  
  // Tính điểm cho từng ứng viên
  const matchResults = [];
  
  for (const candidate of candidates) {
    console.log(`\n   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`   Evaluating: User ${candidate.user_id} (${candidate.username})`);
    
    const matchScore = await calculateTotalMatchScore(
      currentUserId,
      candidate.user_id,
      currentUser.dob,
      candidate.dob
    );
    
    matchResults.push({
      ...matchScore,
      candidateInfo: {
        userId: candidate.user_id,
        username: candidate.username,
        fullName: candidate.full_name,
        avatarUrl: candidate.avatar_url,
        location: candidate.location
      }
    });
  }
  
  // Sắp xếp theo điểm tổng (giảm dần)
  matchResults.sort((a, b) => b.totalScore - a.totalScore);
  
  console.log(`\n   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`   🏆 BEST MATCH FOUND!`);
  console.log(`   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  
  const bestMatch = matchResults[0];
  console.log(`   👤 User: ${bestMatch.candidateInfo.username}`);
  console.log(`   📊 Total Score: ${bestMatch.totalScore}/100`);
  console.log(`   💝 Interest Score: ${bestMatch.interestScore}/70`);
  console.log(`   🔮 Numerology Score: ${bestMatch.numerologyScore}/30`);
  console.log(`   🎯 Common Interests: ${bestMatch.commonInterests.length}`);
  console.log(`   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  
  return bestMatch;
}

module.exports = {
  getCandidateUsers,
  calculateTotalMatchScore,
  findBestMatchForUser
};
