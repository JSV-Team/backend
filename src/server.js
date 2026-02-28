const app = require('./app');
const { connectDB } = require('./config/db');
require('dotenv').config();

// 1. IMPORT HÀM KẾT NỐI DB VÀO ĐÂY

const PORT = process.env.PORT || 3001;

const startServer = async () => {
  try {
    // Connect to database first
    await connectDB();
    console.log('✅ Database connected successfully');

    app.listen(PORT, () => {
      console.log(`✅ Server is running on http://localhost:${PORT}`);
      console.log(`✅ API available at http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
