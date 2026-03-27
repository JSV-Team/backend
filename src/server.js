const http = require('http'); // reload 1

const app = require('./app');
const { connectDB } = require('./config/db');
const { validateEnvironment } = require('./config/validateEnv');
const setupSocket = require('./socket');
const { startMatchingEngine } = require('./services/matchingEngineLoop');
require('dotenv').config();

// Validate environment variables before starting
validateEnvironment();

const PORT = process.env.PORT || 3001;

// 1. Khởi tạo server HTTP bọc Express
const server = http.createServer(app);

// 2. Khởi tạo Socket.IO qua helper
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
      const pool = getPool();
      await pool.query(`
        ALTER TABLE Conversations DROP CONSTRAINT IF EXISTS CHK_Conversation_Type;
        ALTER TABLE Conversations ADD CONSTRAINT CHK_Conversation_Type CHECK (conversation_type IN ('direct', 'group', 'activity', 'private'));
        
        ALTER TABLE conversation_members ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ DEFAULT NOW();
        
        ALTER TABLE activities DROP CONSTRAINT IF EXISTS chk_activities_status;
        ALTER TABLE activities ADD CONSTRAINT chk_activities_status CHECK (status IN ('active', 'deleted', 'profile'));
        
        ALTER TABLE match_sessions DROP CONSTRAINT IF EXISTS chk_match_type;
        ALTER TABLE match_sessions ADD CONSTRAINT chk_match_type CHECK (match_type IN ('random', 'selective', 'interest', 'distance', 'enhanced'));
      `);
      console.log('✅ DB Constraints & Columns auto-patched for new features');

      // Fix avatar URLs - remove local domain
      const fixResult = await pool.query(`
        UPDATE users 
        SET avatar_url = REGEXP_REPLACE(avatar_url, '^https?://(127\\.0\\.0\\.1|localhost)(:\\d+)?', '', 'g')
        WHERE avatar_url LIKE 'http://127.0.0.1%' 
           OR avatar_url LIKE 'http://localhost%'
        RETURNING user_id, username, avatar_url;
      `);
      if (fixResult.rowCount > 0) {
        console.log(`✅ Fixed ${fixResult.rowCount} avatar URLs (removed local domain)`);
      }
    } catch (dbErr) {
      console.log('⚠️ Could not patch DB:', dbErr.message);
    }

    server.listen(PORT, () => {
      console.log(`✅ Server is running on http://localhost:${PORT}`);
      console.log(`✅ API available at http://localhost:${PORT}/api`);
      console.log(`✅ Socket.IO is ready`);

      // Start the matching engine loop
      startMatchingEngine(io);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
