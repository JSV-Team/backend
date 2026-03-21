require("dotenv").config();

module.exports = {
  dbConfig: {
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '123',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'SoThichDB',
  }
}
};