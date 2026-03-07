require("dotenv").config();

const serverAddress = process.env.DB_HOST;
const port = Number(process.env.DB_PORT);

console.log(`[DB Config] Connecting to ${serverAddress}:${port}, Database: ${process.env.DB_NAME}`);

module.exports = {
  dbConfig: {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: serverAddress,
    port: port,
    database: process.env.DB_NAME,
    options: {
      encrypt: false,              
      trustServerCertificate: true,
      connectionTimeout: 30000,
      requestTimeout: 30000
    }
  }
};