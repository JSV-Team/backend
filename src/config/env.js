require("dotenv").config();

const serverAddress = process.env.DB_HOST;
const port = Number(process.env.DB_PORT);

console.log(`[DB Config] Connecting to ${serverAddress}:${port}, Database: ${process.env.DB_NAME}`);

module.exports = {
  dbConfig: {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,      
    port: Number(process.env.DB_PORT),
    database: process.env.DB_DATABASE,  
    options: {
      encrypt: false,
      trustServerCertificate: true
    }
  }
};