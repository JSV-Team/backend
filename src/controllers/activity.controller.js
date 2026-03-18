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

const getPendingApprovals = asyncHandler(async (req, res) => {
    try {
        const userId = parseInt(req.query.userId);
        if (!userId) return res.status(400).json({ message: 'Thiếu userId' });
        const result = await activityService.getPendingApprovals(userId);
        res.json(result);
    } catch (error) {
        console.error('Lỗi khi lấy pending approvals:', error);
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

const approveActivityRequest = asyncHandler(async (req, res) => {
    try {
        const requestId = parseInt(req.params.id);
        const data = await activityService.approveActivityRequest(requestId);
        res.json({ message: 'Đã duyệt yêu cầu và thêm vào nhóm chat thành công!', data });
    } catch (error) {
        console.error('Lỗi khi duyệt yêu cầu:', error);
        res.status(500).json({ message: error.message || 'Lỗi Server' });
    }
});

const rejectActivityRequest = asyncHandler(async (req, res) => {
    try {
        const requestId = parseInt(req.params.id);
        const data = await activityService.rejectActivityRequest(requestId);
        res.json({ message: 'Đã từ chối yêu cầu thành công!', data });
    } catch (error) {
        console.error('Lỗi khi từ chối yêu cầu:', error);
        res.status(500).json({ message: error.message || 'Lỗi Server' });
    }
});

const deleteActivity = asyncHandler(async (req, res) => {
    const activityId = parseInt(req.params.id);
    const userId = req.body.userId || parseInt(req.query.userId);

    console.log(`[DEBUG] Attempting to delete activity: ID=${activityId}, UserID=${userId}`);

    try {
        if (!userId) {
            console.log('[DEBUG] No userId provided in request');
            return res.status(401).json({ message: 'Không xác định được user' });
        }

        const result = await activityService.deleteActivity(activityId, userId);
        console.log('[DEBUG] Deletion successful for ID:', activityId);
        res.json({ message: 'Xóa bài viết thành công' });
    } catch (error) {
        console.error('[DEBUG] Error in deleteActivity controller:', error);
        if (error.message.includes('không tồn tại hoặc bạn không có quyền xóa')) {
            return res.status(403).json({ message: error.message });
        }
        res.status(500).json({ message: error.message || 'Lỗi Server' });
    }
});

module.exports = {
    getPendingActivities,
    deleteActivityRequest,
    getActivities,
    joinActivity,
    approveActivityRequest,
    rejectActivityRequest,
    getPendingApprovals,
    deleteActivity
};