const { getPool } = require('../config/db');

// Tạo phòng chat mới (chọn Type = activity cho group của bài đăng)
const createConversation = async (conversationType, activityId = null) => {
    const pool = getPool();
    const query = `
        INSERT INTO conversations (conversation_type, activity_id, created_at)
        VALUES ($1, $2, NOW())
        RETURNING conversation_id;
    `;
    const result = await pool.query(query, [conversationType, activityId]);
    return result.rows[0].conversation_id;
};

// Check xem activity_id đã có Conversation chưa
const getConversationByActivityId = async (activityId) => {
    const pool = getPool();
    const query = `SELECT conversation_id FROM conversations WHERE activity_id = $1`;
    const result = await pool.query(query, [activityId]);
    return result.rows[0];
};

// Lấy Private Conversation giữa 2 user, bỏ qua việc left_at có bị set hay chưa
const getPrivateConversation = async (user1, user2) => {
    const pool = getPool();
    const query = `
        SELECT c.conversation_id 
        FROM conversations c
        JOIN conversation_members m1 ON c.conversation_id = m1.conversation_id AND m1.user_id = $1
        JOIN conversation_members m2 ON c.conversation_id = m2.conversation_id AND m2.user_id = $2
        WHERE c.conversation_type = 'private'
    `;
    const result = await pool.query(query, [user1, user2]);
    return result.rows[0];
};

// Thêm member vào phòng
const addMember = async (conversationId, userId, role = 'member') => {
    const pool = getPool();
    // Sử dụng ON CONFLICT vì (conversation_id, user_id) là PRIMARY KEY
    const query = `
        INSERT INTO conversation_members (conversation_id, user_id, role, joined_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (conversation_id, user_id) 
        DO UPDATE SET left_at = NULL, role = EXCLUDED.role;
    `;
    await pool.query(query, [conversationId, userId, role]);
};

// Lưu tin nhắn
const saveMessage = async (conversationId, senderId, content, msgType = 'text', imageUrl = null) => {
    const pool = getPool();
    const query = `
        WITH inserted AS (
            INSERT INTO messages (conversation_id, sender_id, content, msg_type, image_url, created_at)
            VALUES ($1, $2, $3, $4, $5, NOW())
            RETURNING *
        )
        SELECT 
            i.message_id, i.conversation_id, i.sender_id, i.content, i.msg_type, i.image_url, i.created_at,
            u.full_name AS sender_name, u.avatar_url AS sender_avatar
        FROM inserted i
        JOIN users u ON i.sender_id = u.user_id;
    `;
    const result = await pool.query(query, [conversationId, senderId, content, msgType, imageUrl]);
    return result.rows[0];
};

// Lấy danh sách Conversations của 1 User
const getUserConversations = async (userId) => {
    const pool = getPool();
    const query = `
         SELECT 
             c.conversation_id, c.conversation_type, c.activity_id,
             CASE 
                WHEN c.conversation_type = 'private' THEN 
                    (SELECT u.full_name 
                     FROM conversation_members cm2 
                     JOIN users u ON cm2.user_id = u.user_id 
                     WHERE cm2.conversation_id = c.conversation_id AND cm2.user_id != $1
                     LIMIT 1)
                ELSE a.title 
             END AS activity_title,
             CASE 
                WHEN c.conversation_type = 'private' THEN 
                    (SELECT u.avatar_url 
                     FROM conversation_members cm2 
                     JOIN users u ON cm2.user_id = u.user_id 
                     WHERE cm2.conversation_id = c.conversation_id AND cm2.user_id != $1
                     LIMIT 1)
                ELSE NULL
             END AS other_avatar_url,
             CASE 
                WHEN c.conversation_type = 'private' THEN 
                    (SELECT cm2.user_id 
                     FROM conversation_members cm2 
                     WHERE cm2.conversation_id = c.conversation_id AND cm2.user_id != $1
                     LIMIT 1)
                ELSE NULL
             END AS other_user_id,
             CASE 
                WHEN c.conversation_type = 'private' THEN 
                    (SELECT 
                        CASE WHEN EXISTS (
                            SELECT 1 FROM follows f1 
                            WHERE f1.follower_id = $1 AND f1.following_id = cm2.user_id
                        ) AND EXISTS (
                            SELECT 1 FROM follows f2 
                            WHERE f2.follower_id = cm2.user_id AND f2.following_id = $1
                        ) THEN 1 ELSE 0 END
                     FROM conversation_members cm2 
                     WHERE cm2.conversation_id = c.conversation_id AND cm2.user_id != $1
                     LIMIT 1)
                ELSE 0
             END AS is_friend,
             cm.role AS user_role,
             (
                SELECT CASE WHEN msg_type = 'image' THEN '[Hình ảnh]' ELSE content END
                FROM messages m 
                WHERE m.conversation_id = c.conversation_id 
                ORDER BY created_at DESC
                LIMIT 1
             ) as last_message,
             (
                SELECT created_at 
                FROM messages m 
                WHERE m.conversation_id = c.conversation_id 
                ORDER BY created_at DESC
                LIMIT 1
             ) as last_message_time
         FROM conversations c
         JOIN conversation_members cm ON c.conversation_id = cm.conversation_id
         LEFT JOIN activities a ON c.activity_id = a.activity_id
         WHERE cm.user_id = $1 AND cm.left_at IS NULL
         ORDER BY last_message_time DESC NULLS LAST
     `;
    const result = await pool.query(query, [userId]);
    return result.rows;
};

// Phân trang tin nhắn
const getMessages = async (conversationId, limit, offset) => {
    const pool = getPool();
    const query = `
        SELECT 
            m.message_id, m.conversation_id, m.sender_id, m.content, m.msg_type, m.image_url, m.created_at,
            u.full_name AS sender_name, u.avatar_url AS sender_avatar
        FROM messages m
        JOIN users u ON m.sender_id = u.user_id
        WHERE m.conversation_id = $1
        ORDER BY m.created_at DESC
        LIMIT $2 OFFSET $3
    `;
    const result = await pool.query(query, [conversationId, limit, offset]);
    return result.rows.reverse(); // Đảo ngược để gửi FE thứ tự thời gian cũ -> mới
};

// Ktra user có trong phòng không
const checkMembership = async (conversationId, userId) => {
    const pool = getPool();
    const query = `
        SELECT 1 FROM conversation_members 
        WHERE conversation_id = $1 AND user_id = $2 AND left_at IS NULL
    `;
    const result = await pool.query(query, [conversationId, userId]);
    return result.rows.length > 0;
};

// Ghi nhận Rời nhóm
const leaveConversation = async (conversationId, userId) => {
    const pool = getPool();
    const query = `
        UPDATE conversation_members SET left_at = NOW()
        WHERE conversation_id = $1 AND user_id = $2
    `;
    await pool.query(query, [conversationId, userId]);
};

// Lấy danh sách thành viên của 1 cuộc trò chuyện
const getConversationMembers = async (conversationId) => {
    const pool = getPool();
    const query = `
        SELECT 
            u.user_id, u.full_name, u.avatar_url, u.email,
            cm.role, cm.joined_at
        FROM conversation_members cm
        JOIN users u ON cm.user_id = u.user_id
        WHERE cm.conversation_id = $1 AND cm.left_at IS NULL
        ORDER BY (CASE WHEN cm.role = 'host' THEN 1 ELSE 0 END) DESC, u.full_name ASC
    `;
    const result = await pool.query(query, [conversationId]);
    return result.rows;
};

module.exports = {
    createConversation,
    getConversationByActivityId,
    addMember,
    saveMessage,
    getUserConversations,
    getMessages,
    checkMembership,
    leaveConversation,
    getConversationMembers,
    getPrivateConversation
};
