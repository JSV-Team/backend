require("dotenv").config();

const serverAddress = process.env.DB_SERVER || process.env.DB_HOST || 'localhost';
const databaseName = process.env.DB_DATABASE || process.env.DB_NAME || 'SoThichDB';
const port = Number(process.env.DB_PORT) || 1433;

console.log(`[DB Config] Connecting to ${serverAddress}:${port}, Database: ${databaseName}`);

module.exports = {
  dbConfig: {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME,
    options: {
      encrypt: false,
      trustServerCertificate: true
    }
  }
};