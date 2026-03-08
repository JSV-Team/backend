const { getPool, sql } = require("../config/db");

// Search users by username or full_name
exports.search = async (query) => {
  const pool = await getPool();
  
  if (!query || query.trim() === "") {
    // Return empty array if no query
    return [];
  }
  
  const searchTerm = `%${query.trim()}%`;
  
  const result = await pool.request()
    .input("search", sql.NVarChar(100), searchTerm)
    .query(`
      SELECT user_id, username, full_name, avatar_url, bio
      FROM Users 
      WHERE (username LIKE @search OR full_name LIKE @search)
        AND status = 'active'
      ORDER BY full_name
      OFFSET 0 ROWS FETCH NEXT 20 ROWS ONLY
    `);
  
  return result.recordset;
};

