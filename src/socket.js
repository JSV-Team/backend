const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const chatService = require('./services/chat.service');
const { setupMatchSocket } = require('./socket/matchSocket');

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
        const userId = socket.handshake.auth.userId;
        const token = socket.handshake.auth.token;
        
        console.log('🔐 Socket auth middleware - userId:', userId, 'token:', token ? 'present' : 'missing');
        console.log('   Full auth object:', socket.handshake.auth);
        
        if (!userId) {
            console.log('❌ Auth failed: Missing userId');
            return next(new Error("Authentication error: Missing userId"));
        }
        
        if (!token) {
            console.log('❌ Auth failed: Missing token');
            return next(new Error("Authentication error: Missing token"));
        }
        
        // TODO: Verify JWT token here in production
        // For now, just accept the userId
        socket.userId = parseInt(userId);
        console.log('✅ Socket authenticated for user:', socket.userId);
        next();
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
