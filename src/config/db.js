const { Pool } = require("pg");
require("dotenv").config();

console.log("[DEBUG DB CONFIG]");
console.log("DB_USER provided:", process.env.DB_USER ? `Yes (${process.env.DB_USER})` : "No");
console.log("DB_HOST provided:", process.env.DB_HOST ? `Yes (${process.env.DB_HOST})` : "No");
console.log("DATABASE_URL provided:", process.env.DATABASE_URL ? "Yes" : "No");

const dbConfig = process.env.DATABASE_URL 
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    }
  : {
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT || 5432,
      ssl: { rejectUnauthorized: false }
    };

const pool = new Pool(dbConfig);
const connectDB = async () => {
  try {
    await pool.connect();
    console.log("✅ PostgreSQL connected");
  } catch (err) {
    console.error("❌ PostgreSQL connection failed:", err);
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
  pool,
  connectDB,
  getPool
};
