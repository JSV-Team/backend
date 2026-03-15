const mssql = require("mssql");
const { getPool } = require("../config/db");

// Lấy profile của user
exports.getProfile = async (userId) => {
  const pool = await getPool();
  const r = await pool.request()
    .input("userId", mssql.Int, userId)
    .query(`
      SELECT user_id, username, full_name, email, avatar_url, bio, location,
             reputation_score, gender, dob, created_at
      FROM Users WHERE user_id=@userId
    `);

  if (!r.recordset[0]) throw Object.assign(new Error("User not found"), { status: 404 });
  return r.recordset[0];
};

// Cập nhật profile
exports.updateProfile = async (userId, payload) => {
  const pool = await getPool();
  const { full_name, email, avatar_url, bio, location, gender, dob } = payload;

  // Fetch current profile to get current email if not provided
  const current = await exports.getProfile(userId);

  await pool.request()
    .input("userId", mssql.Int, userId)
    .input("full_name", mssql.NVarChar(100), full_name ?? current.full_name)
    .input("email", mssql.NVarChar(255), email ?? current.email)
    .input("avatar_url", mssql.NVarChar(500), avatar_url ?? current.avatar_url)
    .input("bio", mssql.NVarChar(mssql.MAX), bio ?? current.bio)
    .input("location", mssql.NVarChar(100), location ?? current.location)
    .input("gender", mssql.NVarChar(10), gender ?? current.gender)
    .input("dob", mssql.Date, dob ?? current.dob)
    .query(`
      UPDATE Users
      SET full_name=@full_name, email=@email,
          avatar_url=@avatar_url, bio=@bio, location=@location,
          gender=@gender, dob=@dob
      WHERE user_id=@userId
    `);

  return exports.getProfile(userId);
};

// Lấy danh sách sở thích của user
exports.getInterests = async (userId) => {
  const pool = await getPool();
  const r = await pool.request()
    .input("userId", mssql.Int, userId)
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
exports.updateInterests = async (userId, interests) => {
  const pool = await getPool();
  const tx = new mssql.Transaction(pool);

  const clean = [...new Set((interests || []).map(x => String(x).trim()).filter(Boolean))];

  await tx.begin();
  try {
    // Xóa hết interests cũ
    await new mssql.Request(tx)
      .input("userId", mssql.Int, userId)
      .query(`DELETE FROM UserInterests WHERE user_id=@userId`);

    for (const name of clean) {
      // Upsert interest
      const ins = await new mssql.Request(tx)
        .input("name", mssql.NVarChar(100), name)
        .query(`
          MERGE Interests AS t
          USING (SELECT @name AS name) AS s
          ON t.name=s.name
          WHEN NOT MATCHED THEN INSERT(name) VALUES(s.name)
          OUTPUT inserted.interest_id;
        `);

      const interestId = ins.recordset[0]?.interest_id;
      if (!interestId) continue;

      await new mssql.Request(tx)
        .input("userId", mssql.Int, userId)
        .input("interestId", mssql.Int, interestId)
        .query(`INSERT INTO UserInterests(user_id, interest_id) VALUES(@userId, @interestId)`);
    }

    await tx.commit();
    return exports.getInterests(userId);
  } catch (e) {
    await tx.rollback();
    throw e;
  }
};

