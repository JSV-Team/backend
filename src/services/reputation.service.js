const { getPool, sql } = require("../config/db");

exports.logs = async (userId, { from, to, deducted_by }) => {
  const pool = await getPool();
  const req = pool.request().input("userId", sql.Int, userId);

  let where = "WHERE rl.user_id=@userId";

  if (from) { where += " AND rl.created_at >= @from"; req.input("from", sql.DateTime2, new Date(from)); }
  if (to) { where += " AND rl.created_at < DATEADD(day,1,@to)"; req.input("to", sql.DateTime2, new Date(to)); }
  if (deducted_by) { where += " AND rl.deducted_by = @deducted_by"; req.input("deducted_by", sql.Int, Number(deducted_by)); }

  const r = await req.query(`
    SELECT rl.log_id, rl.action, rl.reason, rl.point_change, rl.point_after, rl.created_at,
           rl.deducted_by,
           u2.full_name AS deducted_by_name
    FROM ReputationLogs rl
    LEFT JOIN Users u2 ON u2.user_id = rl.deducted_by
    ${where}
    ORDER BY rl.created_at DESC
  `);

  return r.recordset;
};