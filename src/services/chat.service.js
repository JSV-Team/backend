const chatModel = require('../models/chat.model');

const getUserConversations = async (userId) => {
    return await chatModel.getUserConversations(userId);
};

const getMessages = async (conversationId, userId, page = 1, limit = 20) => {
    // 1. Authorization: Ktra user phải là member
    const isMember = await chatModel.checkMembership(conversationId, userId);
    if (!isMember) {
        throw new Error('Unauthorized: Bạn không thuộc nhóm chat này');
    }

    const offset = (page - 1) * limit;
    return await chatModel.getMessages(conversationId, limit, offset);
};

// Socket calls this
const saveMessage = async (conversationId, senderId, content, msgType = 'text', imageUrl = null) => {
    // Cho phép ảnh không có text
    if (msgType !== 'image') {
        if (!content || content.trim() === '') {
            throw new Error('Tin nhắn rỗng');
        }
    }

    if (content && content.length > 2000) {
        throw new Error('Tin nhắn quá dài (Tối đa 2000 ký tự)');
    }

    // 1. Ktra thành viên
    const isMember = await chatModel.checkMembership(conversationId, senderId);
    if (!isMember) {
        throw new Error('Unauthorized');
    }

    // 2. Chống XSS cơ bản (chỉ áp dụng nếu có content)
    const safeContent = content ? content.replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';

    return await chatModel.saveMessage(conversationId, senderId, safeContent, msgType, imageUrl);
};

const leaveConversation = async (conversationId, userId) => {
    const isMember = await chatModel.checkMembership(conversationId, userId);
    if (!isMember) {
        throw new Error('Bạn không có trong nhóm này');
    }
    await chatModel.leaveConversation(conversationId, userId);

    // Gửi auto message "X đã rời nhóm"
    await chatModel.saveMessage(conversationId, userId, "Đã rời nhóm", "system");
};

// Gọi khi chủ group ấn Duyệt Request
const initOrJoinActivityChat = async (activityId, hostId, memberId) => {
    let conv = await chatModel.getConversationByActivityId(activityId);

    // Tạo nhóm nếu chưa có
    if (!conv) {
        const convId = await chatModel.createConversation('activity', activityId);
        // Thêm Host
        await chatModel.addMember(convId, hostId, 'host');
        conv = { conversation_id: convId };
    }

    // Thêm Member mới vào
    await chatModel.addMember(conv.conversation_id, memberId, 'member');

    // Có thể tự động bắn tin "memberId đã join"...
};

const getOrInitPrivateConversation = async (user1, user2) => {
    if (user1 === user2) throw new Error('Không thể tự chat với chính mình');
    let conv = await chatModel.getPrivateConversation(user1, user2);

    if (!conv) {
        const convId = await chatModel.createConversation('private', null);
        await chatModel.addMember(convId, user1, 'member');
        await chatModel.addMember(convId, user2, 'member');
        conv = { conversation_id: convId };
    } else {
        // Đảm bảo cả hai user đều ở trong phòng (reset left_at nếu từng rời đi)
        await chatModel.addMember(conv.conversation_id, user1, 'member');
        await chatModel.addMember(conv.conversation_id, user2, 'member');
    }
    return conv;
};

const getConversationMembers = async (conversationId) => {
    return await chatModel.getConversationMembers(conversationId);
};

module.exports = {
    getUserConversations,
    getMessages,
    saveMessage,
    leaveConversation,
    initOrJoinActivityChat,
    getConversationMembers,
    getOrInitPrivateConversation
};
