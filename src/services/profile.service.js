const { getPool } = require("../config/db");

// Lấy profile của user
exports.getProfile = async (userId) => {
  const pool = await getPool();
  const r = await pool.query(`
      SELECT user_id, username, full_name, email, avatar_url, bio, location,
             reputation_score, gender, dob, created_at
      FROM users WHERE user_id=$1
    `, [userId]);

  if (!r.rows[0]) throw Object.assign(new Error("User not found"), { status: 404 });
  return r.rows[0];
};

// Cập nhật profile
exports.updateProfile = async (userId, payload) => {
  const pool = await getPool();
  const { full_name, email, avatar_url, bio, location, gender, dob } = payload;

  // Fetch current profile to get current email if not provided
  const current = await exports.getProfile(userId);

  await pool.query(`
      UPDATE users
      SET full_name=$1, email=$2,
          avatar_url=$3, bio=$4, location=$5,
          gender=$6, dob=$7
      WHERE user_id=$8
    `, [
      full_name || current.full_name,
      email || current.email,
      avatar_url ?? current.avatar_url,
      bio ?? current.bio,
      location ?? current.location,
      gender ?? current.gender,
      dob ?? current.dob,
      userId
    ]);

  return exports.getProfile(userId);
};

// Lấy danh sách sở thích của user
exports.getInterests = async (userId) => {
  const pool = await getPool();
  const r = await pool.query(`
      SELECT i.interest_id, i.name
      FROM user_interests ui
      JOIN interests i ON i.interest_id = ui.interest_id
      WHERE ui.user_id=$1
      ORDER BY i.name
    `, [userId]);
  return r.rows;
};

// Cập nhật sở thích
exports.updateInterests = async (userId, interests) => {
  const pool = await getPool();
  const client = await pool.connect();

  const clean = [...new Set((interests || []).map(x => String(x).trim()).filter(Boolean))];

  try {
    await client.query('BEGIN');
    
    // Xóa hết interests cũ
    await client.query(`DELETE FROM user_interests WHERE user_id=$1`, [userId]);

    for (const name of clean) {
      // Upsert interest
      const ins = await client.query(`
        INSERT INTO interests (name) 
        VALUES ($1)
        ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
        RETURNING interest_id;
      `, [name]);

      const interestId = ins.rows[0]?.interest_id;
      if (!interestId) continue;

      await client.query(`
        INSERT INTO user_interests(user_id, interest_id) 
        VALUES($1, $2)
        ON CONFLICT DO NOTHING
      `, [userId, interestId]);
    }

    await client.query('COMMIT');
    return exports.getInterests(userId);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};
