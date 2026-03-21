const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');
const activityModel = require('../models/activity.model');

router.get('/conversations', chatController.getConversations);
router.get('/conversations/:conversationId/messages', chatController.getMessages);
router.get('/conversations/:conversationId/members', chatController.getMembers);
router.patch('/conversations/:conversationId/leave', chatController.leaveGroup);
router.post('/private', chatController.getOrInitPrivateChat);

// Chat với host của activity - chỉ cho phép khi request đã được accepted
router.post('/activity-host', async (req, res) => {
    const { activityId, userId } = req.body;
    
    if (!activityId || !userId) {
        return res.status(400).json({ 
            message: "Thiếu activityId hoặc userId",
            errorCode: "MISSING_PARAMS"
        });
    }

    // Kiểm tra quyền nhắn tin
    try {
        await chatController.getOrInitPrivateChatLogic(userId, null, activityId);
    } catch (error) {
        return res.status(403).json({ 
            message: error.message,
            errorCode: "CANNOT_MESSAGE_HOST",
            canChat: false
        });
    }

    // Lấy host ID của activity
    const hostId = await activityModel.getActivityHostId(activityId);
    if (!hostId) {
        return res.status(404).json({ 
            message: "Không tìm thấy hoạt động",
            errorCode: "ACTIVITY_NOT_FOUND"
        });
    }

    // Đã được duyệt - tạo hoặc lấy conversation private
    try {
        const conv = await chatController.getOrInitPrivateChatLogic(userId, hostId);
        res.json({ 
            message: "OK",
            conversation: conv,
            canChat: true
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Kiểm tra có thể nhắn tin cho host không (không tạo conversation)
router.post('/check-can-message-host', chatController.checkCanMessageHost);

module.exports = router;
