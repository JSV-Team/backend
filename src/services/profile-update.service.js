const { getPool, sql } = require("../config/db");

// Lấy profile của user
exports.getUserProfile = async (userId) => {
  const pool = await getPool();
  const r = await pool.request()
    .input("userId", sql.Int, userId)
    .query(`
      SELECT user_id, username, full_name, email, avatar_url, bio, location,
             reputation_score, created_at
      FROM Users WHERE user_id=@userId
    `);

  if (!r.recordset[0]) throw Object.assign(new Error("User not found"), { status: 404 });
  return r.recordset[0];
};

// Cập nhật profile
exports.updateUserProfile = async (userId, payload) => {
  const pool = await getPool();
  const { full_name, avatar_url, bio, location } = payload;

  await pool.request()
    .input("userId", sql.Int, userId)
    .input("full_name", sql.NVarChar(100), full_name ?? null)
    .input("avatar_url", sql.NVarChar(500), avatar_url ?? null)
    .input("bio", sql.NVarChar(sql.MAX), bio ?? null)
    .input("location", sql.NVarChar(100), location ?? null)
    .query(`
      UPDATE Users
      SET full_name=@full_name, avatar_url=@avatar_url, bio=@bio, location=@location
      WHERE user_id=@userId
    `);

  return this.getUserProfile(userId);
};

// Lấy danh sách sở thích của user
exports.getUserInterests = async (userId) => {
  const pool = await getPool();
  const r = await pool.request()
    .input("userId", sql.Int, userId)
    .query(`
      SELECT i.interest_id, i.name
      FROM UserInterests ui
      JOIN Interests i ON i.interest_id = ui.interest_id
      WHERE ui.user_id=@userId
      ORDER BY i.name
    `);
  return r.recordset;
};

// Cập nhật sở thích
exports.updateUserInterests = async (userId, interests) => {
  const pool = await getPool();
  const tx = new sql.Transaction(pool);

  const clean = [...new Set((interests || []).map(x => String(x).trim()).filter(Boolean))];

  await tx.begin();
  try {
    // Xóa hết interests cũ
    await new sql.Request(tx)
      .input("userId", sql.Int, userId)
      .query(`DELETE FROM UserInterests WHERE user_id=@userId`);

    for (const name of clean) {
      // Upsert interest
      const ins = await new sql.Request(tx)
        .input("name", sql.NVarChar(100), name)
        .query(`
          MERGE Interests AS t
          USING (SELECT @name AS name) AS s
          ON t.name=s.name
          WHEN NOT MATCHED THEN INSERT(name) VALUES(s.name)
          OUTPUT inserted.interest_id;
        `);

      const interestId = ins.recordset[0]?.interest_id;
      if (!interestId) continue;

      await new sql.Request(tx)
        .input("userId", sql.Int, userId)
        .input("interestId", sql.Int, interestId)
        .query(`INSERT INTO UserInterests(user_id, interest_id) VALUES(@userId, @interestId)`);
    }

    await tx.commit();
    return this.getUserInterests(userId);
  } catch (e) {
    await tx.rollback();
    throw e;
  }
};

