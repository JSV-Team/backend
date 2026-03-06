const { getPool } = require('../config/db');
const sql = require('mssql');

// Tạo phòng chat mới (chọn Type = activity cho group của bài đăng)
const createConversation = async (conversationType, activityId = null) => {
    const pool = getPool();
    const result = await pool.request()
        .input('type', sql.NVarChar, conversationType)
        .input('activityId', sql.Int, activityId)
        .query(`
            INSERT INTO Conversations (conversation_type, activity_id, created_at)
            VALUES (@type, @activityId, SYSDATETIME());
            SELECT SCOPE_IDENTITY() AS conversation_id;
        `);
    return result.recordset[0].conversation_id;
};

// Check xem activity_id đã có Conversation chưa
const getConversationByActivityId = async (activityId) => {
    const pool = getPool();
    const result = await pool.request()
        .input('activityId', sql.Int, activityId)
        .query(`SELECT conversation_id FROM Conversations WHERE activity_id = @activityId`);
    return result.recordset[0];
};

// Lấy Private Conversation giữa 2 user, bỏ qua việc left_at có bị set hay chưa
const getPrivateConversation = async (user1, user2) => {
    const pool = getPool();
    const result = await pool.request()
        .input('u1', sql.Int, user1)
        .input('u2', sql.Int, user2)
        .query(`
            SELECT c.conversation_id 
            FROM Conversations c
            JOIN ConversationMembers m1 ON c.conversation_id = m1.conversation_id AND m1.user_id = @u1
            JOIN ConversationMembers m2 ON c.conversation_id = m2.conversation_id AND m2.user_id = @u2
            WHERE c.conversation_type = 'private'
        `);
    return result.recordset[0];
};

// Thêm member vào phòng
const addMember = async (conversationId, userId, role = 'member') => {
    const pool = getPool();
    // Bỏ qua nếu đã join nhưng leave thì reset left_at
    await pool.request()
        .input('convId', sql.Int, conversationId)
        .input('userId', sql.Int, userId)
        .input('role', sql.NVarChar, role)
        .query(`
            IF EXISTS (SELECT 1 FROM ConversationMembers WHERE conversation_id = @convId AND user_id = @userId)
            BEGIN
                UPDATE ConversationMembers SET left_at = NULL, role = @role WHERE conversation_id = @convId AND user_id = @userId
            END
            ELSE
            BEGIN
                INSERT INTO ConversationMembers (conversation_id, user_id, role, joined_at)
                VALUES (@convId, @userId, @role, SYSDATETIME())
            END
        `);
};

// Lưu tin nhắn
const saveMessage = async (conversationId, senderId, content, msgType = 'text', imageUrl = null) => {
    const pool = getPool();
    const result = await pool.request()
        .input('convId', sql.Int, conversationId)
        .input('senderId', sql.Int, senderId)
        .input('content', sql.NVarChar, content)
        .input('msgType', sql.NVarChar, msgType)
        .input('imageUrl', sql.NVarChar, imageUrl)
        .query(`
            INSERT INTO Messages (conversation_id, sender_id, content, msg_type, image_url, created_at)
            VALUES (@convId, @senderId, @content, @msgType, @imageUrl, SYSDATETIME());
            
            SELECT 
                m.message_id, m.conversation_id, m.sender_id, m.content, m.msg_type, m.image_url, m.created_at,
                u.full_name AS sender_name, u.avatar_url AS sender_avatar
            FROM Messages m
            JOIN Users u ON m.sender_id = u.user_id
            WHERE m.message_id = SCOPE_IDENTITY();
        `);
    return result.recordset[0];
};

// Lấy danh sách Conversations của 1 User
const getUserConversations = async (userId) => {
    const pool = getPool();
    const result = await pool.request()
        .input('userId', sql.Int, userId)
        .query(`
             SELECT 
                 c.conversation_id, c.conversation_type, c.activity_id,
                 CASE 
                    WHEN c.conversation_type = 'private' THEN 
                        (SELECT TOP 1 u.full_name 
                         FROM ConversationMembers cm2 
                         JOIN Users u ON cm2.user_id = u.user_id 
                         WHERE cm2.conversation_id = c.conversation_id AND cm2.user_id != @userId)
                    ELSE a.title 
                 END AS activity_title,
                 cm.role AS user_role,
                 (
<<<<<<< Updated upstream
                    SELECT TOP 1 CASE WHEN msg_type = 'image' THEN '[Hình ảnh]' ELSE content END 
=======
                    SELECT TOP 1 CASE WHEN msg_type = 'image' THEN '[Hình ảnh]' ELSE content END
>>>>>>> Stashed changes
                    FROM Messages m 
                    WHERE m.conversation_id = c.conversation_id 
                    ORDER BY created_at DESC
                 ) as last_message,
                 (
                    SELECT TOP 1 created_at 
                    FROM Messages m 
                    WHERE m.conversation_id = c.conversation_id 
                    ORDER BY created_at DESC
                 ) as last_message_time
             FROM Conversations c
             JOIN ConversationMembers cm ON c.conversation_id = cm.conversation_id
             LEFT JOIN Activities a ON c.activity_id = a.activity_id
             WHERE cm.user_id = @userId AND cm.left_at IS NULL
             ORDER BY last_message_time DESC
         `);
    return result.recordset;
};

// Phân trang tin nhắn
const getMessages = async (conversationId, limit, offset) => {
    const pool = getPool();
    const result = await pool.request()
        .input('convId', sql.Int, conversationId)
        .input('offset', sql.Int, offset)
        .input('limit', sql.Int, limit)
        .query(`
            SELECT 
                m.message_id, m.conversation_id, m.sender_id, m.content, m.msg_type, m.image_url, m.created_at,
                u.full_name AS sender_name, u.avatar_url AS sender_avatar
            FROM Messages m
            JOIN Users u ON m.sender_id = u.user_id
            WHERE m.conversation_id = @convId
            ORDER BY m.created_at DESC
            OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
        `);
    return result.recordset.reverse(); // Đảo ngược để gửi FE thứ tự thời gian cũ -> mới
};

// Ktra user có trong phòng không
const checkMembership = async (conversationId, userId) => {
    const pool = getPool();
    const result = await pool.request()
        .input('convId', sql.Int, conversationId)
        .input('userId', sql.Int, userId)
        .query(`
            SELECT 1 FROM ConversationMembers 
            WHERE conversation_id = @convId AND user_id = @userId AND left_at IS NULL
        `);
    return result.recordset.length > 0;
};

// Ghi nhận Rời nhóm
const leaveConversation = async (conversationId, userId) => {
    const pool = getPool();
    await pool.request()
        .input('convId', sql.Int, conversationId)
        .input('userId', sql.Int, userId)
        .query(`
            UPDATE ConversationMembers SET left_at = SYSDATETIME()
            WHERE conversation_id = @convId AND user_id = @userId
        `);
};

// Lấy danh sách thành viên của 1 cuộc trò chuyện
const getConversationMembers = async (conversationId) => {
    const pool = getPool();
    const result = await pool.request()
        .input('convId', sql.Int, conversationId)
        .query(`
            SELECT 
                u.user_id, u.full_name, u.avatar_url, u.email,
                cm.role, cm.joined_at
            FROM ConversationMembers cm
            JOIN Users u ON cm.user_id = u.user_id
            WHERE cm.conversation_id = @convId AND cm.left_at IS NULL
            ORDER BY cm.role DESC, u.full_name ASC
        `);
    return result.recordset;
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
