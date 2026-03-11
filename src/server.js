const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const { connectDB } = require('./config/db');
require('dotenv').config();

const PORT = process.env.PORT || 3001;

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // allow from any origin during development
    methods: ["GET", "POST"]
  }
});

// Socket.IO logi
io.on('connection', (socket) => {
  const userId = socket.handshake.auth?.userId;
  console.log(`🔌 User connected: ${userId} (socket_id: ${socket.id})`);

  socket.on('join_rooms', (roomIds) => {
    if (Array.isArray(roomIds)) {
      roomIds.forEach(id => {
        socket.join(`room_${id}`);
        // console.log(`User ${userId} joined room_${id}`);
      });
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

    // Broadcast to the room (including sender if desired, or skip sender using broadcast.to)
    io.to(`room_${conversationId}`).emit('receive_message', message);
    
    if (callback) callback({ status: 'ok' });
  });

  socket.on('disconnect', () => {
    console.log(`🔌 User disconnected: ${userId}`);
  });
});

const startServer = async () => {
  try {
    await connectDB();
    console.log('✅ Database connected successfully');

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
