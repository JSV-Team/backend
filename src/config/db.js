const sql = require("mssql");
const { dbConfig } = require("./env");

let pool;

const connectDB = async () => {
  try {
    // Use TCP/IP instead of named instance for better compatibility
    const config = {
      user: dbConfig.user,
      password: dbConfig.password,
      server: "localhost",
      port: 1433,
      database: dbConfig.database,
      options: {
        encrypt: false,
        trustServerCertificate: true
      }
    };
    
    pool = await sql.connect(config);
    console.log("✅ SQL Server connected successfully");
    console.log(`   Database: ${config.database}`);
    console.log(`   Server: ${config.server}:${config.port}`);
  } catch (err) {
    console.error("❌ SQL Server connection failed:", err.message);
    process.exit(1);
  }
};

const getPool = () => {
  if (!pool) {
    throw new Error("DB not connected yet");
  }
  return pool;
};

module.exports = {
  connectDB,
  getPool
};