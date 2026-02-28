const sql = require("mssql");
const { dbConfig } = require("./env");

let pool;

const connectDB = async () => {
  try {
    pool = await sql.connect(dbConfig);
    console.log("✅ SQL Server connected");
  } catch (err) {
    console.error("❌ SQL Server connection failed:", err);
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