const { pool } = require('../config/db');
const interestService = require('./interestService');
const numerologyService = require('./numerologyService');
const locationUtils = require('../utils/locationUtils');

/**
 * MatchingService - Service nâng cấp với Phễu 4 Tầng
 * Tầng 0: Lọc an toàn (SQL)
 * Tầng 1: Điểm vị trí/khoảng cách (40%)
 * Tầng 2: Điểm sở thích (40%)
 * Tầng 3: Điểm thần số học (20%)
 */

/**
 * Lấy danh sách ứng viên phù hợp cho matching
 * Áp dụng Tầng 0 trong SQL query
 * @param {number} currentUserId - ID của user hiện tại
 * @returns {Promise<Array>} - Danh sách user phù hợp
 */
async function getCandidateUsers(currentUserId) {
  console.log(`\n🔍 [MatchingService] Getting candidates for User ${currentUserId}`);
  
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
      -- Tầng 1: Lọc vị trí (ĐÃ BỎ strict match, để tính điểm khoảng cách)
    ORDER BY u.user_id
  `;
  
  const result = await pool.query(query, [currentUserId]);
  
  console.log(`   ✅ Found ${result.rows.length} candidate users`);
  return result.rows;
}

/**
 * Tính điểm matching tổng hợp cho 2 user với Phễu 4 Tầng
 * Tầng 1: Điểm khoảng cách (40%)
 * Tầng 2: Điểm sở thích (40%)
 * Tầng 3: Điểm thần số học (20%)
 * @param {Object} user1 - Thông tin user 1 (phải có user_id, latitude, longitude, dob)
 * @param {Object} user2 - Thông tin user 2 (phải có user_id, latitude, longitude, dob)
 * @returns {Promise<Object>} - Kết quả matching với điểm số chi tiết
 */
async function calculateTotalMatchScore(user1, user2) {
  const { user_id: userId1, dob: dob1, latitude: lat1, longitude: lon1 } = user1;
  const { user_id: userId2, dob: dob2, latitude: lat2, longitude: lon2 } = user2;
  console.log(`\n🧮 [MatchingService] Calculating total match score`);
  console.log(`   User ${userId1} <-> User ${userId2}`);
  
  // ===== TẦNG 1: ĐIỂM KHOẢNG CÁCH (40%) =====
  console.log(`\n   📍 TẦNG 1: Calculating Distance Score (max 40 points)`);
  
  const distance = locationUtils.calculateDistance(lat1, lon1, lat2, lon2);
  const rawDistanceScore = locationUtils.calculateDistanceScore(distance, 100); // Max distance 100km
  const distanceScore = (rawDistanceScore / 100) * 40;
  
  console.log(`   📏 Distance: ${distance.toFixed(2)} km`);
  console.log(`   📈 Distance Score: ${distanceScore.toFixed(2)}/40 (raw: ${rawDistanceScore}%)`);
  
  // ===== TẦNG 2: ĐIỂM SỞ THÍCH (40%) =====
  console.log(`\n   📊 TẦNG 2: Calculating Interest Score (max 40 points)`);
  
  // Sử dụng logic cũ từ interestService
  const rawInterestScore = await interestService.calculateInterestScore(userId1, userId2);
  
  // Quy đổi về thang điểm 40
  const interestScore = (rawInterestScore / 100) * 40;
  console.log(`   📈 Interest Score: ${interestScore.toFixed(2)}/40 (raw: ${rawInterestScore.toFixed(2)}%)`);
  
  // Lấy sở thích chung để hiển thị
  const commonInterests = await interestService.getCommonInterests(userId1, userId2);
  
  // ===== TẦNG 3: ĐIỂM THẦN SỐ HỌC (20%) =====
  console.log(`\n   🔮 TẦNG 3: Calculating Numerology Score (max 20 points)`);
  
  // Tính Life Path Number cho cả 2 user
  const lifePathNum1 = numerologyService.getLifePathNumber(dob1);
  const lifePathNum2 = numerologyService.getLifePathNumber(dob2);
  
  // Tính điểm thần số học
  const rawNumerologyScore = numerologyService.calculateNumerologyScore(lifePathNum1, lifePathNum2);
  // Quy đổi về thang điểm 20 (original is 30)
  const numerologyScore = (rawNumerologyScore / 30) * 20;
  console.log(`   🌟 Numerology Score: ${numerologyScore.toFixed(2)}/20 (raw: ${rawNumerologyScore}/30)`);
  
  // ===== TỔNG KẾT =====
  const totalScore = distanceScore + interestScore + numerologyScore;
  
  console.log(`\n   🎯 TOTAL MATCH SCORE: ${totalScore.toFixed(2)}/100`);
  console.log(`      - Distance (40%): ${distanceScore.toFixed(2)}`);
  console.log(`      - Interest (40%): ${interestScore.toFixed(2)}`);
  console.log(`      - Numerology (20%): ${numerologyScore.toFixed(2)}`);
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
      distance: {
        score: Math.round(distanceScore * 100) / 100,
        weight: '40%',
        km: distance.toFixed(2)
      },
      interest: {
        score: Math.round(interestScore * 100) / 100,
        weight: '40%',
        rawScore: Math.round(rawInterestScore * 100) / 100
      },
      numerology: {
        score: Math.round(numerologyScore * 100) / 100,
        weight: '20%',
        lifePathNumbers: [lifePathNum1, lifePathNum2],
        rawScore: rawNumerologyScore
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
    'SELECT user_id, username, full_name, location, dob, latitude, longitude FROM users WHERE user_id = $1',
    [currentUserId]
  );
  
  if (currentUserQuery.rows.length === 0) {
    console.log(`   ❌ User ${currentUserId} not found`);
    return null;
  }
  
  const currentUser = currentUserQuery.rows[0];
  console.log(`   👤 Current user: ${currentUser.username} (${currentUser.location})`);
  
  // Lấy danh sách ứng viên (ĐÃ BỎ LỘC CÙNG THÀNH PHỐ)
  const candidates = await getCandidateUsers(currentUserId);
  
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
      currentUser,
      candidate
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
