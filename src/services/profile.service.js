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
    .input("full_name", mssql.NVarChar(100), full_name || current.full_name)
    .input("email", mssql.NVarChar(255), email || current.email)
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
          WHEN MATCHED THEN UPDATE SET name=s.name
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

// Lấy thống kê theo dõi
exports.getFollowStats = async (userId) => {
  const pool = await getPool();
  const r = await pool.request()
    .input("userId", mssql.Int, userId)
    .query(`
      SELECT 
        (SELECT COUNT(*) FROM Follows WHERE following_id=@userId) AS followers_count,
        (SELECT COUNT(*) FROM Follows WHERE follower_id=@userId) AS following_count
    `);
  return r.recordset[0];
};

// Lấy danh sách người theo dõi chung (A and B both follow X)
exports.getMutualFollowers = async (myId, targetId) => {
  const pool = await getPool();
  if (!myId || !targetId) return [];
  
  const r = await pool.request()
    .input("myId", mssql.Int, myId)
    .input("targetId", mssql.Int, targetId)
    .query(`
      SELECT u.user_id, u.username, u.full_name, u.avatar_url
      FROM Users u
      WHERE u.user_id IN (
        SELECT following_id FROM Follows WHERE follower_id = @myId
        INTERSECT
        SELECT following_id FROM Follows WHERE follower_id = @targetId
      )
    `);
  return r.recordset;
};

// Kiểm tra xem user có DailyStatus (Story) đang hoạt động không
exports.hasActiveStory = async (userId) => {
  const pool = await getPool();
  const r = await pool.request()
    .input("userId", mssql.Int, userId)
    .query(`
      SELECT 1 FROM DailyStatus 
      WHERE user_id=@userId AND expires_at > SYSDATETIME()
    `);
  return r.recordset.length > 0;
};

// Theo dõi một người dùng
exports.followUser = async (myId, targetId) => {
  console.log(`>>> [SERVICE] followUser - myId: ${myId}, targetId: ${targetId}`);
  const pool = await getPool();
  if (myId === targetId) throw Object.assign(new Error("Cannot follow yourself"), { status: 400 });
  
  await pool.request()
    .input("myId", mssql.Int, myId)
    .input("targetId", mssql.Int, targetId)
    .query(`
      IF NOT EXISTS (SELECT 1 FROM Follows WHERE follower_id=@myId AND following_id=@targetId)
        INSERT INTO Follows (follower_id, following_id, created_at)
        VALUES (@myId, @targetId, SYSDATETIME())
    `);
  return { ok: true };
};

// Bỏ theo dõi một người dùng
exports.unfollowUser = async (myId, targetId) => {
  const pool = await getPool();
  await pool.request()
    .input("myId", mssql.Int, myId)
    .input("targetId", mssql.Int, targetId)
    .query(`DELETE FROM Follows WHERE follower_id=@myId AND following_id=@targetId`);
  return { ok: true };
};

// Kiểm tra xem đã theo dõi chưa
exports.isFollowing = async (myId, targetId) => {
  const pool = await getPool();
  if (!myId || !targetId) return false;
  const r = await pool.request()
    .input("myId", mssql.Int, myId)
    .input("targetId", mssql.Int, targetId)
    .query(`SELECT 1 FROM Follows WHERE follower_id=@myId AND following_id=@targetId`);
  return r.recordset.length > 0;
};

