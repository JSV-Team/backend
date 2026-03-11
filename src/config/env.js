require("dotenv").config();

module.exports = {
  dbConfig: {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER || process.env.DB_HOST,      
    port: Number(process.env.DB_PORT),
    database: process.env.DB_DATABASE || process.env.DB_NAME,  
    options: {
      encrypt: false,
      trustServerCertificate: true
    }
  }
};