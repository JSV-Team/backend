const activityModel = require('../models/activity.model');
const notificationService = require('./notification.service');

const getPendingActivities = async (userId) => {
    return await activityModel.getPendingActivities(userId);
};

const getPendingApprovals = async (userId) => {
    return await activityModel.getRequestsToApprove(userId);
};

const deleteActivityRequest = async (requestId) => {
    await activityModel.deleteActivityRequest(requestId);
};

const getApprovedActivities = async () => {
    return await activityModel.getApprovedActivities();
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
const approveActivityRequest = async (requestId) => {
    const requestData = await activityModel.approveActivityRequest(requestId);
    if (!requestData) {
        throw new Error('Không tìm thấy yêu cầu hoặc yêu cầu đã được xử lý');
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

// Gọi khi host bấm Reject Request
const rejectActivityRequest = async (requestId) => {
    const requestData = await activityModel.rejectActivityRequest(requestId);
    if (!requestData) {
        throw new Error('Không tìm thấy yêu cầu hoặc yêu cầu đã được xử lý');
    }

    const activityResult = await activityModel.getActivityById(requestData.activity_id);
    if (activityResult && activityResult.length > 0) {
        const content = `Yêu cầu tham gia hoạt động "${activityResult[0].title}" của bạn đã bị từ chối.`;
        await notificationService.createNotification(requestData.requester_id, 'system', content, requestData.activity_id);
    }
    return requestData;
}
const deleteActivity = async (activityId, userId) => {
    if (!activityId || !userId) {
        throw new Error('activityId và userId là bắt buộc');
    }

    const result = await activityModel.deleteActivity(activityId, userId);
    if (!result) {
        throw new Error('Hoạt động không tồn tại hoặc bạn không có quyền xóa');
    }

    return result;
};

const createActivity = async (activityData) => {
    if (!activityData || !activityData.user_id || !activityData.title) {
        throw new Error('user_id và title là bắt buộc');
    }

    return await activityModel.createActivity(activityData);
};

module.exports = {
    getPendingActivities,
    deleteActivityRequest,
    getApprovedActivities,
    joinActivity,
    approveActivityRequest,
    getPendingApprovals,
    rejectActivityRequest,
    deleteActivity,
    createActivity
};
