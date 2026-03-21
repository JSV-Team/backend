require("dotenv").config();

const serverAddress = process.env.DB_SERVER || 'localhost';
const databaseName = process.env.DB_DATABASE || 'SoThichDB';
const port = Number(process.env.DB_PORT) || 1433;

console.log(`[DB Config] Connecting to ${serverAddress}:${port}, Database: ${databaseName}`);

module.exports = {
  dbConfig: {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: serverAddress,      
    port: port,
    database: databaseName,  
    options: {
      encrypt: false,
      trustServerCertificate: true
    }
  }
}
};