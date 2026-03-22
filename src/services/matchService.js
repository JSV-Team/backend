const { getPool } = require('../config/db');
const chatModel = require('../models/chat.model');

/**
 * Create a match session between two users
 * @param {number} userOne - First user ID
 * @param {number} userTwo - Second user ID
 * @param {string} matchType - Type of match (default: 'interest')
 * @returns {Promise<object>} Created match session
 */
const createMatchSession = async (userOne, userTwo, matchType = 'interest') => {
    // Do not match a user with themselves
    if (userOne === userTwo) {
        throw new Error('Không thể ghép đôi với chính mình');
    }

    // Ensure user_one is always smaller than user_two
    const sortedUsers = [userOne, userTwo].sort((a, b) => a - b);
    const userOneId = sortedUsers[0];
    const userTwoId = sortedUsers[1];

    const pool = getPool();
    const query = `
        INSERT INTO match_sessions (user_one, user_two, match_type, requested_by, status, created_at)
        VALUES ($1, $2, $3, NULL, 'active', NOW())
        RETURNING match_id, user_one, user_two, match_type, status, created_at;
    `;
    
    const result = await pool.query(query, [userOneId, userTwoId, matchType]);
    return result.rows[0];
};

/**
 * Create a private conversation between two users
 * @param {number} userOneId - First user ID
 * @param {number} userTwoId - Second user ID
 * @returns {Promise<number>} Created conversation ID
 */
const createConversation = async (userOneId, userTwoId) => {
    // Do not create conversation with themselves
    if (userOneId === userTwoId) {
        throw new Error('Không thể tạo cuộc trò chuyện với chính mình');
    }

    // Create conversation with type 'private' and group_lifetime 'permanent'
    const conversationId = await chatModel.createConversation('private', null);
    
    // Add both users as members
    await chatModel.addMember(conversationId, userOneId, 'member');
    await chatModel.addMember(conversationId, userTwoId, 'member');
    
    return conversationId;
};

/**
 * Get match history for a user
 * @param {number} userId - User ID
 * @param {number} limit - Maximum number of records to return (default: 20)
 * @returns {Promise<Array>} Match history array
 */
const getMatchHistory = async (userId, limit = 20) => {
    const pool = getPool();
    const query = `
        SELECT 
            ms.match_id,
            ms.user_one,
            ms.user_two,
            ms.match_type,
            ms.status,
            ms.created_at,
            CASE 
                WHEN ms.user_one = $1 THEN u2.user_id
                ELSE u1.user_id
            END AS matched_user_id,
            CASE 
                WHEN ms.user_one = $1 THEN u2.username
                ELSE u1.username
            END AS matched_username,
            CASE 
                WHEN ms.user_one = $1 THEN u2.full_name
                ELSE u1.full_name
            END AS matched_full_name,
            CASE 
                WHEN ms.user_one = $1 THEN u2.avatar_url
                ELSE u1.avatar_url
            END AS matched_avatar_url,
            CASE 
                WHEN ms.user_one = $1 THEN u2.bio
                ELSE u1.bio
            END AS matched_bio
        FROM match_sessions ms
        JOIN users u1 ON ms.user_one = u1.user_id
        JOIN users u2 ON ms.user_two = u2.user_id
        WHERE (ms.user_one = $1 OR ms.user_two = $1)
          AND ms.status = 'active'
        ORDER BY ms.created_at DESC
        LIMIT $2;
    `;
    
    const result = await pool.query(query, [userId, limit]);
    return result.rows;
};

/**
 * Get basic user information
 * @param {number} userId - User ID
 * @returns {Promise<object|null>} User info object or null if not found
 */
const getUserInfo = async (userId) => {
    const pool = getPool();
    const query = `
        SELECT user_id, username, full_name, avatar_url, bio
        FROM users
        WHERE user_id = $1 AND status = 'active';
    `;
    
    const result = await pool.query(query, [userId]);
    return result.rows[0] || null;
};

module.exports = {
    createMatchSession,
    createConversation,
    getMatchHistory,
    getUserInfo
};