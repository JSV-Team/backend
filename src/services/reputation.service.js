const { getPool } = require("../config/db");

exports.logs = async (userId, { from, to, deducted_by }) => {
  const pool = getPool();
  const values = [userId];
  let where = "WHERE rl.user_id = $1";
  let paramIndex = 2;

  if (from) {
    where += ` AND rl.created_at >= $${paramIndex++}`;
    values.push(new Date(from));
  }
  if (to) {
    where += ` AND rl.created_at < ($${paramIndex++}::date + INTERVAL '1 day')`;
    values.push(new Date(to));
  }
  if (deducted_by) {
    where += ` AND rl.deducted_by = $${paramIndex++}`;
    values.push(Number(deducted_by));
  }

  const query = `
    SELECT rl.log_id, rl.action, rl.reason, rl.point_change, rl.point_after, rl.created_at,
           rl.deducted_by,
           u2.full_name AS deducted_by_name
    FROM ReputationLogs rl
    LEFT JOIN Users u2 ON u2.user_id = rl.deducted_by
    ${where}
    ORDER BY rl.created_at DESC
  `;

  const r = await pool.query(query, values);
  return r.rows;
};