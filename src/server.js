const http = require('http'); // reload 1

const app = require('./app');
const { connectDB } = require('./config/db');
const setupSocket = require('./socket');
require('dotenv').config();

const PORT = process.env.PORT || 3001;

// 1. Khởi tạo server HTTP bọc Express
const server = http.createServer(app);

// 2. Khởi tạo Socket.IO qua helper (nếu có file socket.js)
// Nếu không có socket.js, ta sẽ dùng logic inline
let io;
try {
  io = setupSocket(server);
} catch (e) {
  const { Server } = require('socket.io');
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });
  
  io.on('connection', (socket) => {
    const userId = socket.handshake.auth?.userId;
    console.log(`🔌 User connected: ${userId} (socket_id: ${socket.id})`);
    
    socket.on('join_rooms', (roomIds) => {
      if (Array.isArray(roomIds)) {
        roomIds.forEach(id => socket.join(`room_${id}`));
      }
    });

    socket.on('send_message', (data, callback) => {
      const { conversationId, content, msgType, imageUrl } = data;
      const message = {
        conversation_id: conversationId,
        sender_id: userId,
        content,
        msg_type: msgType,
        image_url: imageUrl,
        created_at: new Date().toISOString()
      };
      io.to(`room_${conversationId}`).emit('receive_message', message);
      if (callback) callback({ status: 'ok' });
    });

    socket.on('disconnect', () => {
      console.log(`🔌 User disconnected: ${userId}`);
    });
  });
}

// Lưu io vào app để dùng trong Controller khi cần broadcast sự kiện
app.set('io', io);

const startServer = async () => {
  try {
    await connectDB();
    console.log('✅ Database connected successfully');

    // Auto-patch Database Constraint for 'private' chat types
    try {
      const { getPool } = require('./config/db');
      await getPool().request().query(`
        IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CHK_Conversation_Type')
        BEGIN
            ALTER TABLE Conversations DROP CONSTRAINT CHK_Conversation_Type;
        END
        ALTER TABLE Conversations ADD CONSTRAINT CHK_Conversation_Type CHECK (conversation_type IN ('direct', 'group', 'activity', 'private'));
      `);
      console.log('✅ DB Constraint CHK_Conversation_Type patched for private chat');
    } catch (dbErr) {
      console.log('⚠️ Could not patch DB Constraint:', dbErr.message);
    }

    server.listen(PORT, () => {
      console.log(`✅ Server is running on http://localhost:${PORT}`);
      console.log(`✅ API available at http://localhost:${PORT}/api`);
      console.log(`✅ Socket.IO is ready`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
