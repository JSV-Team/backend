const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const chatService = require('./services/chat.service');
const { setupMatchSocket } = require('./socket/matchSocket');

// Lữu trữ danh sách users đang online
const onlineUsers = new Map();

const setupSocket = (server) => {
    const io = socketIo(server, {
        cors: {
            origin: process.env.CLIENT_URL || '*', 
            methods: ["GET", "POST", "PATCH"],
            credentials: true
        }
    });

    // Middleware check connection — verify JWT, do NOT trust client-sent userId
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;

        console.log('🔐 Socket auth middleware - token:', token ? 'present' : 'missing');

        if (!token) {
            console.log('❌ Auth failed: Missing token');
            return next(new Error('Authentication error: Missing token'));
        }

        const secret = process.env.JWT_SECRET;
        if (!secret) {
            return next(new Error('Server configuration error: JWT_SECRET not set'));
        }

        try {
            const decoded = jwt.verify(token, secret);
            // Use user_id from token — never from client-provided auth.userId
            socket.userId = decoded.user_id;
            console.log('✅ Socket authenticated for user:', socket.userId);
            next();
        } catch (err) {
            console.log('❌ Auth failed: Invalid token -', err.message);
            return next(new Error('Authentication error: Invalid or expired token'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`🔌 User connected: ${socket.userId}`);
        onlineUsers.set(socket.userId, socket.id);

        // Setup matching socket handlers
        setupMatchSocket(io, socket);

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

        socket.on('disconnect', (reason) => {
            console.log(`❌ User disconnected: ${socket.userId}, reason: ${reason}`);
            onlineUsers.delete(socket.userId);
        });
    });

    return io;
};

module.exports = setupSocket;
