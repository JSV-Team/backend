const asyncHandler = require('express-async-handler');
const chatService = require('../services/chat.service');

const getConversations = asyncHandler(async (req, res) => {
    // Demo mặc định là 2 nếu FE không truyền để test
    const userId = req.query.userId || 2;
    const result = await chatService.getUserConversations(userId);
    res.json(result);
});

const getMessages = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const userId = req.query.userId || 2;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await chatService.getMessages(conversationId, userId, page, limit);
    res.json(result);
});

const leaveGroup = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const userId = req.body.userId || 2;

    await chatService.leaveConversation(conversationId, userId);
    res.json({ message: "Đã rời nhóm thành công!" });
});

const getMembers = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const members = await chatService.getConversationMembers(conversationId);
    res.json(members);
});

module.exports = {
    getConversations,
    getMessages,
    leaveGroup,
    getMembers
};
