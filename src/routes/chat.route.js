const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');

router.get('/conversations', chatController.getConversations);
router.get('/conversations/:conversationId/messages', chatController.getMessages);
router.get('/conversations/:conversationId/members', chatController.getMembers);
router.patch('/conversations/:conversationId/leave', chatController.leaveGroup);

module.exports = router;
