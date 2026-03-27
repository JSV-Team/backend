const activityModel = require('../models/activity.model');
const notificationService = require('./notification.service');

const getPendingActivities = async (userId) => {
    return await activityModel.getPendingActivities(userId);
};

const getPendingApprovals = async (userId) => {
    return await activityModel.getRequestsToApprove(userId);
};

const deleteActivityRequest = async (requestId, userId) => {
    const success = await activityModel.deleteActivityRequest(requestId, userId);
    if (!success) {
        throw new Error('Yêu cầu không tồn tại hoặc bạn không có quyền hủy yêu cầu này');
    }
};

const getApprovedActivities = async (page = 1, limit = 15) => {
    return await activityModel.getApprovedActivities(page, limit);
};

const joinActivity = async (activityId, userId) => {
    if (!activityId || !userId) {
        throw new Error('activityId và userId là bắt buộc');
    }

    const activityResult = await activityModel.getActivityById(activityId);
    if (activityResult.length === 0) {
        throw new Error('Không tìm thấy hoạt động');
    }

    const activity = activityResult[0];
    if (activity.creator_id === parseInt(userId)) {
        throw new Error('Bạn là chủ của hoạt động này');
    }

    const existing = await activityModel.checkActivityRequestExists(activityId, userId);
    if (existing.length > 0) {
        throw new Error('Bạn đã gửi yêu cầu tham gia hoạt động này rồi');
    }

    const requesterResult = await activityModel.getUserInfo(userId);
    const requesterName = requesterResult[0]?.full_name || requesterResult[0]?.username || 'Ai đó';

    const requestId = await activityModel.createActivityRequest(activityId, userId);

    const content = `${requesterName} muốn tham gia hoạt động "${activity.title}" của bạn`;
    await notificationService.createNotification(activity.creator_id, 'activity_request', content, requestId);

    return requestId;
};

// Gọi khi host bấm Accept Request
const approveActivityRequest = async (requestId, userId) => {
    const requestData = await activityModel.approveActivityRequest(requestId, userId);
    if (!requestData) {
        throw new Error('Không tìm thấy yêu cầu hoặc bạn không có quyền xử lý yêu cầu này');
    }

    // Tự động tạo nhóm chat và thêm member
    const activityResult = await activityModel.getActivityById(requestData.activity_id);
    if (activityResult && activityResult.length > 0) {
        const hostId = activityResult[0].creator_id;

        // Import chatService dynamically if needed to avoid circular logic
        const chatService = require('./chat.service');
        await chatService.initOrJoinActivityChat(requestData.activity_id, hostId, requestData.requester_id);

        // Gửi thông báo cho người được duyệt
        const content = `Yêu cầu tham gia hoạt động "${activityResult[0].title}" của bạn đã được chấp nhận!`;
        await notificationService.createNotification(requestData.requester_id, 'match_accepted', content, requestData.activity_id);
    }
    return requestData;
};

const deleteActivity = async (activityId, userId) => {
    if (!activityId || !userId) {
        throw new Error('activityId và userId là bắt buộc');
    }

    const result = await activityModel.deleteActivity(activityId, userId);
    if (!result) {
        throw new Error('Hoạt động không tồn tại hoặc bạn không có quyền xóa');
    }

    // Xóa conversation của activity nếu có
    const chatModel = require('../models/chat.model');
    const conv = await chatModel.getConversationByActivityId(activityId);
    if (conv) {
        const pool = require('../config/db').getPool();
        // Xóa messages trước
        await pool.query('DELETE FROM messages WHERE conversation_id = $1', [conv.conversation_id]);
        // Xóa conversation (members sẽ tự xóa do CASCADE)
        await pool.query('DELETE FROM conversations WHERE conversation_id = $1', [conv.conversation_id]);
    }

    return result;
};

const rejectActivityRequest = async (requestId, userId) => {
    if (!requestId) throw new Error('Yêu cầu không hợp lệ');
    const requestData = await activityModel.rejectActivityRequest(requestId, userId);
    if (!requestData) {
        throw new Error('Yêu cầu không tồn tại hoặc bạn không có quyền xử lý yêu cầu này');
    }
    return requestData;
};

const getActivitiesByUserId = async (userId) => {
    return await activityModel.getUserActivities(userId);
};

module.exports = {
    getPendingActivities,
    deleteActivityRequest,
    getApprovedActivities,
    joinActivity,
    approveActivityRequest,
    rejectActivityRequest,
    getPendingApprovals,
    deleteActivity,
    getActivitiesByUserId
};
