const asyncHandler = require('express-async-handler');
const activityService = require('../services/activity.service');

const getPendingActivities = asyncHandler(async (req, res) => {
    try {
        const userId = parseInt(req.query.userId) || 2;
        const result = await activityService.getPendingActivities(userId);
        res.json(result);
    } catch (error) {
        console.error('Lỗi khi lấy pending activities:', error);
        res.status(500).json({ message: 'Lỗi Server' });
    }
});

const deleteActivityRequest = asyncHandler(async (req, res) => {
    try {
        const requestId = parseInt(req.params.id);
        await activityService.deleteActivityRequest(requestId);
        res.json({ message: 'Đã hủy yêu cầu tham gia thành công!' });
    } catch (error) {
        console.error('Lỗi khi hủy yêu cầu:', error);
        res.status(500).json({ message: 'Lỗi Server' });
    }
});

const getActivities = asyncHandler(async (req, res) => {
    try {
        const result = await activityService.getApprovedActivities();
        res.json(result);
    } catch (error) {
        console.error('Lỗi khi lấy hoạt động:', error);
        res.status(500).json({ message: 'Lỗi Server' });
    }
});

const joinActivity = asyncHandler(async (req, res) => {
    const { activityId, userId } = req.body;
    try {
        const requestId = await activityService.joinActivity(activityId, userId);
        res.status(201).json({
            message: 'Gửi yêu cầu tham gia thành công, chờ chủ hoạt động phê duyệt',
            requestId
        });
    } catch (error) {
        console.error('Lỗi khi tham gia hoạt động:', error);
        if (error.message.includes('bắt buộc') || error.message.includes('chủ của hoạt động') || error.message.includes('đã gửi yêu cầu')) {
            return res.status(400).json({ message: error.message });
        }
        if (error.message.includes('Không tìm thấy')) {
            return res.status(404).json({ message: error.message });
        }
        res.status(500).json({ message: 'Lỗi Server: ' + error.message });
    }
});

module.exports = {
    getPendingActivities,
    deleteActivityRequest,
    getActivities,
    joinActivity
};
