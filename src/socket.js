const socketIo = require('socket.io');
const jwt = require('jsonwebtoken'); // Giả sử user có jwt, hoặc mình mock tạm theo userId
const chatService = require('./services/chat.service');

// Lữu trữ danh sách users đang online
const onlineUsers = new Map();

const setupSocket = (server) => {
    const io = socketIo(server, {
        cors: {
            origin: "http://localhost:5173", // URL frontend Vite
            methods: ["GET", "POST"]
        }
    });

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
        onlineUsers.set(socket.userId, socket.id);

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
            try {
                const { conversationId, content, msgType, imageUrl } = data;

                // 1. Lưu DB + Check member security
                const savedMessage = await chatService.saveMessage(conversationId, socket.userId, content, msgType, imageUrl);

                // 2. Broadcast cho mọi người trong room NHẬN tin mới
                io.to(`room_${conversationId}`).emit('receive_message', savedMessage);

                // Trả về cho người gửi biết là Đã Gửi (UX status)
                if (callback) callback({ status: "sent", message: savedMessage });

            } catch (error) {
                console.error("Socket send_message error:", error.message);
                if (callback) callback({ status: "error", error: error.message });
            }
        });

        socket.on('disconnect', () => {
            console.log(`❌ User disconnected: ${socket.userId}`);
            onlineUsers.delete(socket.userId);
        });
    });

    return io;
};

module.exports = setupSocket;
