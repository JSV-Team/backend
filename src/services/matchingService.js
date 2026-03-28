const { pool } = require('../config/db');
const interestService = require('./interestService');
const numerologyService = require('./numerologyService');
const { calculateDistance } = require('../utils/distanceCalculator');
const locationUtils = require('../utils/locationUtils');

/**
 * MatchingService - Service nâng cấp với Phễu 4 Tầng
 * Tầng 0: Lọc an toàn (SQL)
 * Tầng 1: Khoảng cách địa lý (Priority Criterion - không lọc cứng)
 * Tầng 2: Điểm sở thích (70%)
 * Tầng 3: Điểm thần số học (30%)
 * 
 * LƯU Ý: Khoảng cách 40km được dùng làm tiêu chí ưu tiên (tie-breaker)
 * khi 2 người có điểm phù hợp giống nhau
 */

/**
 * Lấy danh sách ứng viên phù hợp cho matching
 * Áp dụng Tầng 0 trong SQL query (chỉ lọc an toàn)
 * Tầng 1 (khoảng cách) được xử lý sau như tiêu chí ưu tiên
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
      u.dob,
      u.latitude,
      u.longitude
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
    ORDER BY u.user_id
  `;
  
  const result = await pool.query(query, [currentUserId]);
  
  console.log(`   ✅ Found ${result.rows.length} candidate users (before distance filtering)`);
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
 * @param {number} lat1 - Vĩ độ user 1
 * @param {number} lon1 - Kinh độ user 1
 * @param {number} lat2 - Vĩ độ user 2
 * @param {number} lon2 - Kinh độ user 2
 * @param {string} loc1 - Vị trí user 1 (địa chỉ/thành phố)
 * @param {string} loc2 - Vị trí user 2 (địa chỉ/thành phố)
 * @returns {Promise<Object>} - Kết quả matching với điểm số chi tiết và khoảng cách
 */
async function calculateTotalMatchScore(userId1, userId2, dob1, dob2, lat1, lon1, lat2, lon2, loc1, loc2) {
  console.log(`\n🧮 [MatchingService] Calculating total match score`);
  console.log(`   User ${userId1} <-> User ${userId2}`);
  
  // =====  // 1. Tính điểm khoảng cách (40 điểm)
  console.log(`\n   📍 TẦNG 1: Calculating Distance Score (max 40 points)`);
  const distance = locationUtils.calculateDistance(lat1, lon1, lat2, lon2);
  const rawDistanceScore = locationUtils.calculateDistanceScoreWithFallback(distance, loc1, loc2);
  const distanceScore = (rawDistanceScore / 100) * 40;
  
  if (distance !== Infinity) {
    console.log(`   📏 Distance: ${distance.toFixed(2)} km`);
  } else {
    console.log(`   ⚠️ Coordinates missing, using location string matching`);
  }
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
  // Điểm thần số học chỉ chiếm 30%, quy đổi về thang điểm 30
  const numerologyScore = (rawNumerologyScore / 30) * 30;
  console.log(`   🌟 Numerology Score: ${numerologyScore.toFixed(2)}/30 (raw: ${rawNumerologyScore}/30)`);
  
  // ===== TỔNG KẾT =====
  const totalScore = distanceScore + interestScore + numerologyScore;
  
  console.log(`\n   🎯 TOTAL MATCH SCORE: ${totalScore.toFixed(2)}/100`);
  console.log(`      - Interest (70%): ${interestScore.toFixed(2)}`);
  console.log(`      - Numerology (30%): ${numerologyScore}`);
  console.log(`      - Distance: ${distance !== null ? distance + ' km' : 'N/A'}`);
  console.log(`      - Common interests: ${commonInterests.length}`);
  
  return {
    userId1,
    userId2,
    totalScore: Math.round(totalScore * 100) / 100,
    interestScore: Math.round(interestScore * 100) / 100,
    numerologyScore,
    distance,
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
        score: numerologyScore,
        weight: '30%',
        lifePathNumbers: [lifePathNum1, lifePathNum2]
      },
      distance: {
        value: distance,
        unit: 'km',
        note: 'Used as tie-breaker when scores are equal'
      }
    }
  };
}

/**
 * Tìm người phù hợp nhất cho user hiện tại
 * Sắp xếp theo totalScore (giảm dần), nếu bằng nhau thì ưu tiên người gần hơn
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
  console.log(`   📍 Coordinates: ${currentUser.latitude}, ${currentUser.longitude}`);
  
  // Lấy danh sách ứng viên (chỉ lọc Tầng 0 - an toàn)
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
      currentUserId,
      candidate.user_id,
      currentUser.dob,
      candidate.dob,
      currentUser.latitude,
      currentUser.longitude,
      candidate.latitude,
      candidate.longitude,
      currentUser.location,
      candidate.location
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
  
  // Sắp xếp theo điểm tổng (giảm dần), nếu bằng nhau thì ưu tiên người gần hơn
  matchResults.sort((a, b) => {
    // So sánh điểm tổng trước
    if (b.totalScore !== a.totalScore) {
      return b.totalScore - a.totalScore;
    }
    
    // Nếu điểm bằng nhau, ưu tiên người gần hơn (khoảng cách nhỏ hơn)
    // Xử lý trường hợp distance null (đặt ở cuối)
    if (a.distance === null && b.distance === null) return 0;
    if (a.distance === null) return 1;
    if (b.distance === null) return -1;
    
    return a.distance - b.distance;
  });
  
  console.log(`\n   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`   🏆 BEST MATCH FOUND!`);
  console.log(`   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  
  const bestMatch = matchResults[0];
  console.log(`   👤 User: ${bestMatch.candidateInfo.username}`);
  console.log(`   📊 Total Score: ${bestMatch.totalScore}/100`);
  console.log(`   💝 Interest Score: ${bestMatch.interestScore}/70`);
  console.log(`   🔮 Numerology Score: ${bestMatch.numerologyScore}/30`);
  console.log(`   📍 Distance: ${bestMatch.distance !== null ? bestMatch.distance + ' km' : 'N/A'}`);
  console.log(`   🎯 Common Interests: ${bestMatch.commonInterests.length}`);
  
  // Hiển thị top 3 để so sánh
  if (matchResults.length > 1) {
    console.log(`\n   📊 Top 3 Matches for comparison:`);
    matchResults.slice(0, 3).forEach((match, index) => {
      console.log(`   ${index + 1}. ${match.candidateInfo.username}: ${match.totalScore}/100 (${match.distance !== null ? match.distance + ' km' : 'N/A'})`);
    });
  }
  
  console.log(`   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  
  return bestMatch;
}

module.exports = {
  getCandidateUsers,
  calculateTotalMatchScore,
  findBestMatchForUser
};
