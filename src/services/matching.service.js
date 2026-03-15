/**
 * Matching Service
 * 
 * Thuật toán ghép đôi (Matching Algorithm):
 * 1. User bật matching → enable()
 * 2. User gọi findMatch() → hệ thống tìm user tương thích:
 *    - Kiểm tra user đã bật matching chưa (reject nếu chưa)
 *    - Kiểm tra user có đang trong match active không (reject nếu có)
 *    - Kiểm tra user có online không (qua Socket.IO)
 *    - Query DB tìm users tương thích (cùng sở thích, đã bật matching, chưa match)
 *    - Lọc chỉ giữ users đang online
 *    - Sắp xếp theo số sở thích chung DESC
 *    - Trả về ứng viên tốt nhất hoặc null
 * 3. Nếu tìm thấy → createMatchSession() tạo phiên atomic:
 *    - Dùng SQL Transaction để đảm bảo tính toàn vẹn
 *    - Tạo Conversation (private, auto_created)
 *    - Thêm cả 2 user vào Conversation
 *    - Tạo MatchSession record
 *    - Cập nhật last_matched_at cho cả 2 user
 *    - Emit socket event 'match:found' cho cả 2 user
 *    - Rollback toàn bộ nếu bất kỳ bước nào thất bại
 */

const sql = require('mssql');
const { getPool } = require('../config/db');
const matchModel = require('../models/match.model');
const matchingModel = require('../models/matching.model');
const userModel = require('../models/user.model');
const chatModel = require('../models/chat.model');

// Socket manager được inject từ server.js để tránh circular dependency
let socketMgr = null;

/**
 * Inject socket manager từ bên ngoài (gọi từ server.js)
 * @param {Object} manager - Socket manager với isUserOnline() và emitToUser()
 */
const setSocketManager = (manager) => {
    socketMgr = manager;
};

/**
 * Bật tính năng ghép đôi cho user
 * @param {number} userId
 */
const enable = async (userId) => {
    await userModel.setMatchingEnabled(userId, true);
};

/**
 * Tắt tính năng ghép đôi cho user
 * @param {number} userId
 */
const disable = async (userId) => {
    await userModel.setMatchingEnabled(userId, false);
};

/**
 * Lấy trạng thái ghép đôi hiện tại
 * @param {number} userId
 * @returns {{ is_matching_enabled: boolean, last_matched_at: Date|null, is_in_active_match: boolean }}
 */
const getStatus = async (userId) => {
    const isEnabled = await userModel.isMatchingEnabled(userId);
    const lastMatchedAt = await userModel.getLastMatchedAt(userId);
    const isInActiveMatch = await matchModel.isUserInActiveMatch(userId);
    
    return {
        is_matching_enabled: isEnabled,
        last_matched_at: lastMatchedAt,
        is_in_active_match: isInActiveMatch
    };
};

/**
 * Kết thúc cuộc trò chuyện ghép đôi hiện tại
 * @param {number} userId
 */
const endMatch = async (userId) => {
    await matchModel.endActiveMatchSessions(userId);
};

/**
 * Tìm user tương thích để ghép đôi
 * Decision points:
 * - Chỉ tìm trong users đã bật matching VÀ đang online
 * - Ưu tiên user có nhiều sở thích chung nhất (shared_interests_count DESC)
 * - Re-check online status trước khi trả kết quả (race condition prevention)
 * @param {number} userId
 * @returns {Object|null} Thông tin user tương thích hoặc null
 */
const findMatch = async (userId) => {
    const status = await getStatus(userId);
    
    if (!status.is_matching_enabled) {
        throw new Error('Bạn chưa bật tính năng ghép đôi');
    }
    if (status.is_in_active_match) {
        throw new Error('Bạn đang trong một cuộc trò chuyện ghép đôi khác');
    }

    const compatibleUsers = await matchingModel.findCompatibleUsers(userId);
    
    if (compatibleUsers.length === 0) {
        return null;
    }

    // Ưu tiên users đang online, nếu không có thì fallback sang tất cả
    let candidates = compatibleUsers;
    if (socketMgr) {
        const onlineOnly = compatibleUsers.filter(u => socketMgr.isUserOnline(u.user_id));
        if (onlineOnly.length > 0) {
            candidates = onlineOnly;
        }
    }

    // SQL đã ORDER BY shared_interests_count DESC → phần tử đầu là match tốt nhất
    return candidates[0];
};

/**
 * Tạo phiên ghép đôi (atomic transaction)
 * Bao gồm: Conversation + Members + MatchSession + update last_matched_at
 * Rollback toàn bộ nếu bất kỳ bước nào thất bại
 * @param {number} user1Id
 * @param {number} user2Id
 * @returns {{ match_session_id: number, conversation_id: number, users: number[] }}
 */
const createMatchSession = async (user1Id, user2Id) => {

    const pool = getPool();
    const transaction = new sql.Transaction(pool);
    
    try {
        await transaction.begin();

        // Step 1: Tạo Conversation private (auto-created bởi hệ thống matching)
        const request = new sql.Request(transaction);
        request.input('type', sql.NVarChar, 'private');
        request.input('activityId', sql.Int, null);
        request.input('isAutoCreated', sql.Bit, 1);
        
        const convResult = await request.query(`
            INSERT INTO Conversations (conversation_type, activity_id, is_auto_created, created_at)
            VALUES (@type, @activityId, @isAutoCreated, SYSDATETIME());
            SELECT SCOPE_IDENTITY() AS conversation_id;
        `);
        const conversationId = convResult.recordset[0].conversation_id;

        // Step 2: Thêm cả 2 user vào conversation
        const reqAddM1 = new sql.Request(transaction);
        reqAddM1.input('convId', sql.Int, conversationId);
        reqAddM1.input('u1', sql.Int, user1Id);
        await reqAddM1.query(`INSERT INTO ConversationMembers (conversation_id, user_id, role, joined_at) VALUES (@convId, @u1, 'member', SYSDATETIME())`);
        
        const reqAddM2 = new sql.Request(transaction);
        reqAddM2.input('convId2', sql.Int, conversationId);
        reqAddM2.input('u2', sql.Int, user2Id);
        await reqAddM2.query(`INSERT INTO ConversationMembers (conversation_id, user_id, role, joined_at) VALUES (@convId2, @u2, 'member', SYSDATETIME())`);

        const reqMatch = new sql.Request(transaction);
        reqMatch.input('mu1', sql.Int, user1Id);
        reqMatch.input('mu2', sql.Int, user2Id);
        const matchResult = await reqMatch.query(`
            INSERT INTO MatchSessions (user_one, user_two, match_type, requested_by, status, created_at)
            VALUES (@mu1, @mu2, 'random', @mu1, 'active', SYSDATETIME());
            SELECT SCOPE_IDENTITY() AS match_id;
        `);
        const sessionId = matchResult.recordset[0].match_id;

        // Step 4: Cập nhật last_matched_at cho cả 2 user
        const reqUpdate1 = new sql.Request(transaction);
        reqUpdate1.input('u1id', sql.Int, user1Id);
        await reqUpdate1.query(`UPDATE Users SET last_matched_at = SYSDATETIME() WHERE user_id = @u1id`);
        
        const reqUpdate2 = new sql.Request(transaction);
        reqUpdate2.input('u2id', sql.Int, user2Id);
        await reqUpdate2.query(`UPDATE Users SET last_matched_at = SYSDATETIME() WHERE user_id = @u2id`);

        await transaction.commit();

        const matchResponse = {
            match_session_id: sessionId,
            conversation_id: conversationId,
            users: [user1Id, user2Id]
        };

        // Step 5: Emit socket event 'match:found' real-time cho cả 2 user
        if (socketMgr) {
            socketMgr.emitToUser(user1Id, 'match:found', { ...matchResponse, matched_user: user2Id });
            socketMgr.emitToUser(user2Id, 'match:found', { ...matchResponse, matched_user: user1Id });
        }

        return matchResponse;
    } catch (err) {
        await transaction.rollback();
        throw new Error('Không thể khởi tạo phiên ghép đôi: ' + err.message);
    }
};

module.exports = {
    setSocketManager,
    enable,
    disable,
    getStatus,
    findMatch,
    createMatchSession,
    endMatch
};
