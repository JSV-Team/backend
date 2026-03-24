const { getPool } = require("../config/db");

exports.logs = async (userId, { from, to, type }) => {
  const pool = await getPool();
  const values = [userId];
  let where = "WHERE rl.user_id = $1";
  let paramIndex = 2;

  if (from) {
    where += " AND rl.created_at >= $" + (paramIndex++);
    values.push(new Date(from));
  }
  if (to) {
    where += " AND rl.created_at < ($" + (paramIndex++) + "::date + INTERVAL '1 day')";
    values.push(new Date(to));
  }
  if (type && type !== 'Tất cả') {
    where += " AND rl.ref_type = $" + (paramIndex++);
    values.push(type.toLowerCase()); // Backend maps 'Hoạt động' -> 'activity' etc.
  }

  const query = `
    SELECT rl.log_id, rl.delta, rl.reason, rl.ref_type, rl.ref_id, rl.created_at
    FROM reputation_logs rl
    ${where}
    ORDER BY rl.created_at DESC
  `;

  const r = await pool.query(query, values);
  return r.rows;
};

exports.getSummary = async (userId) => {
  const pool = await getPool();
  
  // 1. Monthly delta
  const monthDeltaRes = await pool.query(`
    SELECT COALESCE(SUM(delta), 0)::INT as monthly_delta
    FROM reputation_logs
    WHERE user_id = $1 AND created_at >= date_trunc('month', now())
  `, [userId]);

  // 2. Positive action count (delta > 0)
  const positiveCountRes = await pool.query(`
    SELECT COUNT(*)::INT as positive_count
    FROM reputation_logs
    WHERE user_id = $1 AND delta > 0
  `, [userId]);

  // 3. Report count (resolved/pending reports against user)
  const reportCountRes = await pool.query(`
    SELECT COUNT(*)::INT as report_count
    FROM reports
    WHERE reported_user_id = $1
  `, [userId]);

  return {
    monthly_delta: monthDeltaRes.rows[0].monthly_delta,
    positive_count: positiveCountRes.rows[0].positive_count,
    report_count: reportCountRes.rows[0].report_count
  };
};