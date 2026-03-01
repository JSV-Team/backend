const activityModel = require('../models/activity.model');
const notificationService = require('./notification.service');

const getPendingActivities = async (userId) => {
    return await activityModel.getPendingActivities(userId);
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

module.exports = {
    getPendingActivities,
    deleteActivityRequest,
    getApprovedActivities,
    joinActivity
};
