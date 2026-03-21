const { getPool } = require("../config/db");

const createUser = async (user) => {
  const pool = getPool();
  const query = `
      INSERT INTO users (username, email, password_hash, full_name, location)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING user_id;
    `;
  const result = await pool.query(query, [
    user.username,
    user.email,
    user.password_hash,
    user.full_name,
    user.location
  ]);

  return { recordset: [{ user_id: result.rows[0].user_id }] };
};

module.exports = {
  createUser
};