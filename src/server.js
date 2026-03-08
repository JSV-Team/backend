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
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
