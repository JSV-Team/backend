/**
 * EXAMPLE: Cách tích hợp Matching Service vào Controller/Route
 * 
 * File này chứa các ví dụ về cách sử dụng matchingService
 * trong các controller hoặc route handler của bạn
 */

const matchingService = require('../services/matchingService');
const MatchingEngine = require('../services/matchEngine');

// ============================================================
// EXAMPLE 1: API Endpoint - Tìm người phù hợp nhất
// ============================================================

/**
 * GET /api/match/find-best
 * Tìm người phù hợp nhất cho user hiện tại
 */
async function findBestMatchHandler(req, res) {
  try {
    const userId = req.user.userId; // Từ auth middleware
    
    console.log(`🔍 Finding best match for User ${userId}...`);
    
    const bestMatch = await matchingService.findBestMatchForUser(userId);
    
    if (!bestMatch) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người phù hợp. Hãy thử lại sau!'
      });
    }
    
    // Trả về kết quả
    return res.json({
      success: true,
      data: {
        matchedUser: {
          userId: bestMatch.candidateInfo.userId,
          username: bestMatch.candidateInfo.username,
          fullName: bestMatch.candidateInfo.fullName,
          avatarUrl: bestMatch.candidateInfo.avatarUrl,
          location: bestMatch.candidateInfo.location
        },
        matchScore: {
          total: bestMatch.totalScore,
          interest: bestMatch.interestScore,
          numerology: bestMatch.numerologyScore
        },
        commonInterests: bestMatch.commonInterests,
        lifePathNumbers: {
          yours: bestMatch.lifePathNum1,
          theirs: bestMatch.lifePathNum2
        },
        breakdown: bestMatch.breakdown
      }
    });
    
  } catch (error) {
    console.error('❌ Error in findBestMatchHandler:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi tìm kiếm matching'
    });
  }
}

// ============================================================
// EXAMPLE 2: API Endpoint - Tính điểm với user cụ thể
// ============================================================

/**
 * POST /api/match/calculate-score
 * Body: { targetUserId: number }
 * Tính điểm matching giữa user hiện tại và user khác
 */
async function calculateScoreHandler(req, res) {
  try {
    const currentUserId = req.user.userId;
    const { targetUserId } = req.body;
    
    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu targetUserId'
      });
    }
    
    // Lấy thông tin cả 2 user
    const { pool } = require('../config/db');
    const usersQuery = await pool.query(
      'SELECT user_id, username, full_name, location, dob, latitude, longitude FROM users WHERE user_id IN ($1, $2)',
      [currentUserId, targetUserId]
    );
    
    if (usersQuery.rows.length !== 2) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy user'
      });
    }
    
    const currentUser = usersQuery.rows.find(u => u.user_id === currentUserId);
    const targetUser = usersQuery.rows.find(u => u.user_id === targetUserId);
    
    // Tính điểm
    const matchScore = await matchingService.calculateTotalMatchScore(
      currentUserId,
      targetUserId,
      currentUser.dob,
      targetUser.dob,
      currentUser.latitude,
      currentUser.longitude,
      targetUser.latitude,
      targetUser.longitude,
      currentUser.location,
      targetUser.location
    );
    
    return res.json({
      success: true,
      data: {
        targetUser: {
          userId: targetUser.user_id,
          username: targetUser.username,
          fullName: targetUser.full_name
        },
        matchScore: {
          total: matchScore.totalScore,
          interest: matchScore.interestScore,
          numerology: matchScore.numerologyScore
        },
        commonInterests: matchScore.commonInterests,
        breakdown: matchScore.breakdown
      }
    });
    
  } catch (error) {
    console.error('❌ Error in calculateScoreHandler:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi tính điểm'
    });
  }
}

// ============================================================
// EXAMPLE 3: Sử dụng trong MatchEngine (Queue System)
// ============================================================

/**
 * Tích hợp vào hệ thống queue matching hiện tại
 */
async function processMatchQueueWithEnhancedMatching(usersInQueue) {
  // Khởi tạo MatchEngine với Enhanced Matching
  const engine = new MatchingEngine({
    minScoreThreshold: 20,
    waitTimeBonusWeight: 0.1,
    useEnhancedMatching: true  // Bật Phễu 3 Tầng
  });
  
  console.log(`\n🔄 Processing queue with ${usersInQueue.length} users...`);
  
  // Tìm cặp phù hợp nhất
  const bestMatch = await engine.findBestMatch(usersInQueue);
  
  if (!bestMatch) {
    console.log('❌ No valid match found in queue');
    return null;
  }
  
  console.log(`✅ Found match: User ${bestMatch.user1Id} <-> User ${bestMatch.user2Id}`);
  console.log(`   Score: ${bestMatch.score}/100`);
  console.log(`   Interest: ${bestMatch.interestScore}/70`);
  console.log(`   Numerology: ${bestMatch.numerologyScore}/30`);
  
  return bestMatch;
}

// ============================================================
// EXAMPLE 4: API Endpoint - Lấy danh sách ứng viên
// ============================================================

/**
 * GET /api/match/candidates
 * Lấy danh sách tất cả ứng viên phù hợp (đã qua Tầng 0 và Tầng 1)
 */
async function getCandidatesHandler(req, res) {
  try {
    const userId = req.user.userId;
    
    // Lấy thông tin user hiện tại
    const { pool } = require('../config/db');
    const userQuery = await pool.query(
      'SELECT location FROM users WHERE user_id = $1',
      [userId]
    );
    
    if (userQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User không tồn tại'
      });
    }
    
    const userLocation = userQuery.rows[0].location;
    
    // Lấy danh sách ứng viên
    const candidates = await matchingService.getCandidateUsers(userId, userLocation);
    
    return res.json({
      success: true,
      data: {
        total: candidates.length,
        location: userLocation,
        candidates: candidates.map(c => ({
          userId: c.user_id,
          username: c.username,
          fullName: c.full_name,
          avatarUrl: c.avatar_url,
          location: c.location
        }))
      }
    });
    
  } catch (error) {
    console.error('❌ Error in getCandidatesHandler:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy danh sách ứng viên'
    });
  }
}

// ============================================================
// EXAMPLE 5: Batch Processing - Tính điểm cho nhiều user
// ============================================================

/**
 * Tính điểm matching cho nhiều user cùng lúc
 * Hữu ích cho tính năng "Gợi ý bạn bè"
 */
async function calculateBatchScores(currentUserId, targetUserIds) {
  const { pool } = require('../config/db');
  
  // Lấy thông tin user hiện tại
  const currentUserQuery = await pool.query(
    'SELECT user_id, dob, location, latitude, longitude FROM users WHERE user_id = $1',
    [currentUserId]
  );
  
  if (currentUserQuery.rows.length === 0) {
    throw new Error('Current user not found');
  }
  
  const currentUser = currentUserQuery.rows[0];
  
  // Lấy thông tin các target user
  const targetUsersQuery = await pool.query(
    'SELECT user_id, username, full_name, avatar_url, dob, location, latitude, longitude FROM users WHERE user_id = ANY($1)',
    [targetUserIds]
  );
  
  // Tính điểm cho từng user
  const results = [];
  
  for (const targetUser of targetUsersQuery.rows) {
    const matchScore = await matchingService.calculateTotalMatchScore(
      currentUserId,
      targetUser.user_id,
      currentUser.dob,
      targetUser.dob,
      currentUser.latitude,
      currentUser.longitude,
      targetUser.latitude,
      targetUser.longitude,
      currentUser.location,
      targetUser.location
    );
    
    results.push({
      user: {
        userId: targetUser.user_id,
        username: targetUser.username,
        fullName: targetUser.full_name,
        avatarUrl: targetUser.avatar_url
      },
      score: matchScore.totalScore,
      interestScore: matchScore.interestScore,
      numerologyScore: matchScore.numerologyScore,
      commonInterests: matchScore.commonInterests
    });
  }
  
  // Sắp xếp theo điểm giảm dần
  results.sort((a, b) => b.score - a.score);
  
  return results;
}

// ============================================================
// EXPORT
// ============================================================

module.exports = {
  findBestMatchHandler,
  calculateScoreHandler,
  processMatchQueueWithEnhancedMatching,
  getCandidatesHandler,
  calculateBatchScores
};

// ============================================================
// USAGE IN ROUTES
// ============================================================

/*
// routes/match.routes.js

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const {
  findBestMatchHandler,
  calculateScoreHandler,
  getCandidatesHandler
} = require('../examples/matchingIntegrationExample');

// Tìm người phù hợp nhất
router.get('/find-best', authMiddleware, findBestMatchHandler);

// Tính điểm với user cụ thể
router.post('/calculate-score', authMiddleware, calculateScoreHandler);

// Lấy danh sách ứng viên
router.get('/candidates', authMiddleware, getCandidatesHandler);

module.exports = router;
*/
