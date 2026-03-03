const { getPool, sql } = require("../config/db");

exports.search = async (q) => {
  const pool = await getPool();
  const r = await pool.request()
    .input("q", sql.NVarChar(100), `%${q}%`)
    .query(`
      SELECT user_id, username, full_name, avatar_url
      FROM Users
      WHERE username LIKE @q OR full_name LIKE @q
      ORDER BY reputation_score DESC
      OFFSET 0 ROWS FETCH NEXT 20 ROWS ONLY
    `);
  return r.recordset;
};
