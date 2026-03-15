const socketIo = require('socket.io');
const jwt = require('jsonwebtoken'); // Giả sử user có jwt, hoặc mình mock tạm theo userId
const chatService = require('./services/chat.service');

// Lữu trữ danh sách users đang online
// Dùng Set để track multiple connections từ cùng 1 user (mở nhiều tabs)
const onlineUsers = new Map();

const isUserOnline = (userId) => {
    return onlineUsers.has(userId) && onlineUsers.get(userId).sockets.size > 0;
};

const getOnlineUsers = () => {
    return onlineUsers;
};

// Helper function để matching service có thể gửi notify real-time
let ioInstance = null;
const emitToUser = (userId, eventName, payload) => {
    if (ioInstance && isUserOnline(userId)) {
        const userData = onlineUsers.get(userId);
        userData.sockets.forEach(socketId => {
            ioInstance.to(socketId).emit(eventName, payload);
        });
        console.log(`[Socket] 📡 Emitted '${eventName}' to User ${userId}`);
    }
};

const setupSocket = (server) => {
    const io = socketIo(server, {
        cors: {
            origin: "http://localhost:5173", // URL frontend Vite
            methods: ["GET", "POST"]
        }
    });
    ioInstance = io;

    // Middleware check connection
    io.use((socket, next) => {
        // Trong thực tế sẽ verify JWT: const token = socket.handshake.auth.token;
        // Ở đây lấy thẳng userId do frontend gửi lên tạm thời để demo theo DB bạn có
        const userId = socket.handshake.auth.userId;
        if (!userId) {
            return next(new Error("Authentication error: Missing userId"));
        }
        socket.userId = parseInt(userId);
        next();
    });

    io.on('connection', (socket) => {
        console.log(`🔌 User connected: ${socket.userId}`);
        
        if (!onlineUsers.has(socket.userId)) {
            onlineUsers.set(socket.userId, {
                sockets: new Set([socket.id]),
                connectedAt: new Date()
            });
        } else {
            onlineUsers.get(socket.userId).sockets.add(socket.id);
        }

        // Tham gia vào các room của cuộc hội thoại
        socket.on('join_rooms', async (conversationIds) => {
            if (Array.isArray(conversationIds)) {
                conversationIds.forEach(id => {
                    socket.join(`room_${id}`);
                    console.log(`User ${socket.userId} joined room_${id}`);
                });
            }
        });

        // Xử lý gửi tin nhắn
        socket.on('send_message', async (data, callback) => {
            console.log(`[Socket] Received send_message from ${socket.userId}:`, data);
            try {
                const { conversationId, content, msgType, imageUrl } = data;

                // 1. Lưu DB + Check member security
                const savedMessage = await chatService.saveMessage(conversationId, socket.userId, content, msgType, imageUrl);
                console.log(`[Socket] Message saved successfully:`, savedMessage.message_id);

                // 2. Broadcast cho mọi người trong room NHẬN tin mới
                io.to(`room_${conversationId}`).emit('receive_message', savedMessage);
                console.log(`[Socket] Broadcasted to room_${conversationId}`);

                // Trả về cho người gửi biết là Đã Gửi (UX status)
                if (callback) callback({ status: "sent", message: savedMessage });

            } catch (error) {
                console.error("[Socket] send_message error:", error.message);
                if (callback) callback({ status: "error", error: error.message });
            }
        });

        socket.on('disconnect', () => {
            console.log(`❌ User disconnected: ${socket.userId}`);
            const userData = onlineUsers.get(socket.userId);
            if (userData) {
                userData.sockets.delete(socket.id);
                if (userData.sockets.size === 0) {
                    onlineUsers.delete(socket.userId);
                }
            }
        });
    });

    return io;
};

module.exports = {
    setupSocket,
    isUserOnline,
    getOnlineUsers,
    emitToUser
};
