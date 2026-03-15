const { getPool } = require('../config/db');
const sql = require('mssql');

const findCompatibleUsers = async (userId) => {
    const pool = getPool();
    const result = await pool.request()
        .input('userId', sql.Int, userId)
        .query(`
            SELECT 
                u.user_id, 
                u.full_name, 
                u.avatar_url,
                COUNT(ui2.interest_id) as shared_interests_count
            FROM Users u
            JOIN UserInterests ui1 ON ui1.user_id = @userId
            JOIN UserInterests ui2 ON ui2.user_id = u.user_id AND ui1.interest_id = ui2.interest_id
            WHERE u.user_id != @userId
              AND u.is_matching_enabled = 1
              AND NOT EXISTS (
                  SELECT 1 FROM MatchSessions ms 
                  WHERE ms.status = 'active' AND (ms.user_one = u.user_id OR ms.user_two = u.user_id)
              )
            GROUP BY u.user_id, u.full_name, u.avatar_url
            HAVING COUNT(ui2.interest_id) > 0
            ORDER BY shared_interests_count DESC
        `);
        
    return result.recordset;
};

module.exports = {
    findCompatibleUsers
};
