const { pool } = require('../config/db');

/**
 * Lấy danh sách sở thích của user từ database
 * @param {number} userId - ID của user
 * @returns {Promise<Array>} - Mảng các interest objects
 */
async function getUserInterests(userId) {
  const query = `
    SELECT i.interest_id, i.name
    FROM user_interests ui
    JOIN interests i ON ui.interest_id = i.interest_id
    WHERE ui.user_id = $1
  `;
  
  const result = await pool.query(query, [userId]);
  console.log(`📌 getUserInterests(${userId}): Found ${result.rows.length} interests`);
  if (result.rows.length === 0) {
    console.log(`⚠️ User ${userId} has NO interests in database`);
  }
  return result.rows;
}

/**
 * Lấy sở thích chung giữa 2 user
 * @param {number} userId1 - ID của user thứ nhất
 * @param {number} userId2 - ID của user thứ hai
 * @returns {Promise<Array>} - Mảng các interest objects chung
 */
async function getCommonInterests(userId1, userId2) {
  const query = `
    SELECT i.interest_id, i.name
    FROM user_interests ui1
    JOIN interests i ON ui1.interest_id = i.interest_id
    WHERE ui1.user_id = $1
    AND ui1.interest_id IN (
      SELECT ui2.interest_id
      FROM user_interests ui2
      WHERE ui2.user_id = $2
    )
  `;
  
  const result = await pool.query(query, [userId1, userId2]);
  return result.rows;
}

/**
 * Tính điểm tương đồng sở thích giữa 2 user
 * Công thức: Interest_Score = (số sở thích chung) / (tổng số sở thích unique của cả hai người) * 100
 * @param {number} userId1 - ID của user thứ nhất
 * @param {number} userId2 - ID của user thứ hai
 * @returns {Promise<number>} - Điểm tương đồng (0-100)
 */
async function calculateInterestScore(userId1, userId2) {
  // Lấy tất cả interest của user 1
  const user1Interests = await getUserInterests(userId1);
  const interestIds1 = new Set(user1Interests.map(i => i.interest_id));
  
  // Lấy tất cả interest của user 2
  const user2Interests = await getUserInterests(userId2);
  const interestIds2 = new Set(user2Interests.map(i => i.interest_id));
  
  // Tính sở thích chung
  const commonInterests = [...interestIds1].filter(id => interestIds2.has(id));
  const commonCount = commonInterests.length;
  
  // Tính tổng sở thích unique của cả hai người
  const uniqueInterests = new Set([...interestIds1, ...interestIds2]);
  const totalUnique = uniqueInterests.size;
  
  // Tính điểm (tránh chia cho 0)
  if (totalUnique === 0) {
    return 0;
  }
  
  const score = (commonCount / totalUnique) * 100;
  return Math.round(score * 100) / 100; // Làm tròn 2 chữ số thập phân
}

module.exports = {
  getUserInterests,
  getCommonInterests,
  calculateInterestScore
};