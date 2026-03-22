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
    
    // Check if match session already exists
    const checkQuery = `
        SELECT match_id, user_one, user_two, match_type, status, created_at
        FROM match_sessions
        WHERE user_one = $1 AND user_two = $2;
    `;
    
    const existingMatch = await pool.query(checkQuery, [userOneId, userTwoId]);
    
    // If match already exists, return it (or update status to active if needed)
    if (existingMatch.rows.length > 0) {
        const match = existingMatch.rows[0];
        console.log(`♻️  Match session already exists: ${match.match_id} (status: ${match.status})`);
        
        // If match is not active, reactivate it
        if (match.status !== 'active') {
            const updateQuery = `
                UPDATE match_sessions
                SET status = 'active', created_at = NOW()
                WHERE match_id = $1
                RETURNING match_id, user_one, user_two, match_type, status, created_at;
            `;
            const updated = await pool.query(updateQuery, [match.match_id]);
            console.log(`✅ Reactivated match session: ${match.match_id}`);
            return updated.rows[0];
        }
        
        return match;
    }
    
    // Create new match session
    const insertQuery = `
        INSERT INTO match_sessions (user_one, user_two, match_type, requested_by, status, created_at)
        VALUES ($1, $2, $3, NULL, 'active', NOW())
        RETURNING match_id, user_one, user_two, match_type, status, created_at;
    `;
    
    const result = await pool.query(insertQuery, [userOneId, userTwoId, matchType]);
    console.log(`✅ Created new match session: ${result.rows[0].match_id}`);
    return result.rows[0];
};

/**
 * Create a private conversation between two users
 * @param {number} userOneId - First user ID
 * @param {number} userTwoId - Second user ID
 * @returns {Promise<number>} Created or existing conversation ID
 */
const createConversation = async (userOneId, userTwoId) => {
    // Do not create conversation with themselves
    if (userOneId === userTwoId) {
        throw new Error('Không thể tạo cuộc trò chuyện với chính mình');
    }

    const pool = getPool();
    
    // Check if conversation already exists between these two users
    const checkQuery = `
        SELECT c.conversation_id
        FROM conversations c
        WHERE c.conversation_type = 'private'
        AND EXISTS (
            SELECT 1 FROM conversation_members cm1
            WHERE cm1.conversation_id = c.conversation_id
            AND cm1.user_id = $1
        )
        AND EXISTS (
            SELECT 1 FROM conversation_members cm2
            WHERE cm2.conversation_id = c.conversation_id
            AND cm2.user_id = $2
        )
        AND (
            SELECT COUNT(*) FROM conversation_members cm
            WHERE cm.conversation_id = c.conversation_id
        ) = 2
        LIMIT 1;
    `;
    
    const existingConv = await pool.query(checkQuery, [userOneId, userTwoId]);
    
    if (existingConv.rows.length > 0) {
        const conversationId = existingConv.rows[0].conversation_id;
        console.log(`♻️  Conversation already exists: ${conversationId}`);
        return conversationId;
    }
    
    // Create new conversation with type 'private' and group_lifetime 'permanent'
    const conversationId = await chatModel.createConversation('private', null);
    console.log(`✅ Created new conversation: ${conversationId}`);
    
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