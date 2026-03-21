const { getPool } = require("../config/db");

// Search users by username or full_name
exports.search = async (query) => {
  const pool = await getPool();
  
  if (!query || query.trim() === "") {
    // Return empty array if no query
    return [];
  }
  
  const searchTerm = `%${query.trim()}%`;
  
  const result = await pool.query(`
    SELECT user_id, username, full_name, avatar_url, bio
    FROM users 
    WHERE (username ILIKE $1 OR full_name ILIKE $1)
      AND status = 'active'
    ORDER BY full_name
    LIMIT 20 OFFSET 0
  `, [searchTerm]);
  
  return result.rows;
};

