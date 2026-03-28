const asyncHandler = require('express-async-handler');
const chatService = require('../services/chat.service');
const chatModel = require('../models/chat.model');

const getConversations = asyncHandler(async (req, res) => {
    const userId = req.user.user_id;
    const result = await chatService.getUserConversations(userId);
    res.json(result);
});

const getMessages = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const userId = req.user.user_id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await chatService.getMessages(conversationId, userId, page, limit);
    res.json(result);
});

const leaveGroup = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const userId = req.user.user_id;

    await chatService.leaveConversation(conversationId, userId);
    res.json({ message: "Đã rời nhóm thành công!" });
});

const getMembers = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const userId = req.user.user_id;

    // Verify caller is a member of this conversation
    const isMember = await chatModel.checkMembership(conversationId, userId);
    if (!isMember) {
        return res.status(403).json({
            success: false,
            message: 'Bạn không thuộc nhóm chat này'
        });
    }

    const members = await chatService.getConversationMembers(conversationId);
    res.json(members);
});

const getOrInitPrivateChat = asyncHandler(async (req, res) => {
    const { partnerId, activityId } = req.body;
    const userId = req.user.user_id;

    if (!partnerId) {
        return res.status(400).json({ message: "Thiếu partnerId" });
    }

    // Nếu có activityId, kiểm tra request đã được accepted chưa
    if (activityId) {
        try {
            await chatService.canMessageActivityHost(activityId, userId);
        } catch (error) {
            return res.status(403).json({ message: error.message });
        }
    }

    try {
        const conv = await chatService.getOrInitPrivateConversation(userId, partnerId, activityId);
        res.json(conv);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Kiểm tra user có thể nhắn tin cho host của activity không
const checkCanMessageHost = asyncHandler(async (req, res) => {
    const { activityId } = req.body;
    const userId = req.user.user_id;

    if (!activityId) {
        return res.status(400).json({ message: "Thiếu activityId" });
    }

    try {
        await chatService.canMessageActivityHost(activityId, userId);
        res.json({ canMessage: true });
    } catch (error) {
        res.status(403).json({ canMessage: false, message: error.message });
    }
});

const markAsRead = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const userId = req.user.user_id;
    await chatService.markConversationAsRead(conversationId, userId);
    res.json({ message: "OK" });
});

const getUnreadCount = asyncHandler(async (req, res) => {
    const userId = req.user.user_id;
    const result = await chatService.getTotalUnreadCount(userId);
    res.json({ unread_count: result });
});

// Logic riêng để dùng trong route kiểm tra activity request
const getOrInitPrivateChatLogic = async (userId, partnerId, activityId = null) => {
    // Nếu có activityId, kiểm tra request đã được accepted chưa
    if (activityId) {
        await chatService.canMessageActivityHost(activityId, userId);
    }
    return await chatService.getOrInitPrivateConversation(userId, partnerId);
};

module.exports = {
    getConversations,
    getMessages,
    leaveGroup,
    getMembers,
    getOrInitPrivateChat,
    getOrInitPrivateChatLogic,
    checkCanMessageHost,
    markAsRead,
    getUnreadCount
};
