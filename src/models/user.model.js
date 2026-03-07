const { getPool } = require("../config/db");
const sql = require("mssql");

const createUser = async (user) => {
  const pool = getPool();

  const result = await pool.request()
    .input("username", sql.NVarChar, user.username)
    .input("email", sql.NVarChar, user.email)
    .input("password_hash", sql.NVarChar, user.password_hash)
    .input("full_name", sql.NVarChar, user.full_name)
    .input("location", sql.NVarChar, user.location)
    .query(`
      INSERT INTO Users (username, email, password_hash, full_name, location)
      VALUES (@username, @email, @password_hash, @full_name, @location);
      
      SELECT @@IDENTITY as user_id;
    `);

  return result;
};

module.exports = {
  createUser
};