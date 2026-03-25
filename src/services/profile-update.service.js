const { getPool } = require("../config/db");

// Helper logic to ensure we only save relative paths
const sanitizeUrlForDb = (url) => {
  if (!url) return null;
  if (url.includes('127.0.0.1') || url.includes('localhost')) {
    const parts = url.split(/\/uploads\//);
    if (parts.length > 1) return '/uploads/' + parts[1];
  }
  return url;
};

// Lấy profile của user
exports.getUserProfile = async (userId) => {
  const pool = getPool();
  const query = `
      SELECT user_id, username, full_name, email, avatar_url, bio, location,
             reputation_score, created_at
      FROM users WHERE user_id = $1
    `;
  const r = await pool.query(query, [userId]);

  if (r.rows.length === 0) throw Object.assign(new Error("User not found"), { status: 404 });
  return r.rows[0];
};

// Cập nhật profile
exports.updateUserProfile = async (userId, payload) => {
  const pool = getPool();
  const { full_name, avatar_url, bio, location } = payload;

  const query = `
      UPDATE users
      SET full_name = $1, avatar_url = $2, bio = $3, location = $4
      WHERE user_id = $5
    `;
  await pool.query(query, [
    full_name ?? null,
    sanitizeUrlForDb(avatar_url) ?? null,
    bio ?? null,
    location ?? null,
    userId
  ]);

  return exports.getUserProfile(userId);
};

// Lấy danh sách sở thích của user
exports.getUserInterests = async (userId) => {
  const pool = getPool();
  const query = `
      SELECT i.interest_id, i.name
      FROM user_interests ui
      JOIN interests i ON i.interest_id = ui.interest_id
      WHERE ui.user_id = $1
      ORDER BY i.name
    `;
  const r = await pool.query(query, [userId]);
  return r.rows;
};

// Cập nhật sở thích
exports.updateUserInterests = async (userId, interests) => {
  const pool = getPool();
  
  // Use client from pool for transaction
  const client = await pool.connect();

  const clean = [...new Set((interests || []).map(x => String(x).trim()).filter(Boolean))];

  try {
    await client.query('BEGIN');

    // Xóa hết interests cũ
    await client.query(`DELETE FROM user_interests WHERE user_id = $1`, [userId]);

    for (const name of clean) {
      // Upsert interest
      const insResult = await client.query(`
        INSERT INTO interests (name) 
        VALUES ($1)
        ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
        RETURNING interest_id;
      `, [name]);

      const interestId = insResult.rows[0]?.interest_id;
      if (!interestId) continue;

      await client.query(
        `INSERT INTO user_interests (user_id, interest_id) VALUES($1, $2) ON CONFLICT DO NOTHING`, 
        [userId, interestId]
      );
    }

    await client.query('COMMIT');
    return exports.getUserInterests(userId);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};
