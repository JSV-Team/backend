const app = require('./app');
const { connectDB } = require('./config/db');
const http = require('http');
const setupSocket = require('./socket');
require('dotenv').config();

const PORT = process.env.PORT || 3001;

// 1. Khởi tạo server HTTP bọc Express
const server = http.createServer(app);

// 2. Khởi tạo Socket.IO
const io = setupSocket(server);

// Lưu io vào app để dùng trong Controller khi cần broadcast sự kiện
app.set('io', io);

const startServer = async () => {
  try {
    await connectDB();
    console.log('✅ Database connected successfully');

    server.listen(PORT, () => {
      console.log(`✅ Server is running on http://localhost:${PORT}`);
      console.log(`✅ API available at http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
