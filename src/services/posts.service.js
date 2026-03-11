const { getPool, sql } = require("../config/db");
// Tránh require('mssql') trực tiếp ở đây để đồng nhất instance

exports.listByUser = async (userId) => {
  const pool = await getPool();
    const r = await pool.request()
    .input("userId", sql.Int, userId)
    .query(`
      SELECT a.activity_id AS post_id, a.creator_id AS user_id, 
             a.title AS content, a.description, a.location, 
             a.duration_minutes, a.max_participants, a.created_at,
             (SELECT TOP 1 image_url FROM ActivityImages WHERE activity_id = a.activity_id) AS image_url
      FROM Activities a
      WHERE a.creator_id=@userId
      ORDER BY a.created_at DESC
    `);
  return r.recordset;
};

exports.createPost = async (userId, payload) => {
  console.log(`[posts.service] createPost - userId: ${userId} (${typeof userId})`);
  const pool = await getPool();
  const tx = new sql.Transaction(pool);

  const { content, privacy = "public", tags = [], media = [], is_featured = 0 } = payload;

  await tx.begin();
  try {
    const insPost = await new sql.Request(tx)
      .input("userId", sql.Int, userId)
      .input("title", sql.NVarChar(200), payload.title || payload.content || "Không tiêu đề")
      .input("description", sql.NVarChar(sql.MAX), payload.description || payload.desc || "")
      .input("location", sql.NVarChar(100), payload.location || null)
      .input("duration", sql.Int, payload.duration_minutes || null)
      .input("maxParticipants", sql.Int, payload.max_participants || null)
      .query(`
        INSERT INTO Activities(creator_id, title, description, location, duration_minutes, max_participants)
        OUTPUT inserted.activity_id
        VALUES (@userId, @title, @description, @location, @duration, @maxParticipants)
      `);

    const postId = insPost.recordset[0].activity_id;

    // media (nếu có)
    for (const m of media || []) {
      if (!m?.url) continue;
      await new sql.Request(tx)
        .input("postId", sql.Int, postId)
        .input("url", sql.NVarChar(500), m.url)
        .query(`INSERT INTO ActivityImages(activity_id, image_url) VALUES(@postId, @url)`);
    }

    await tx.commit();
    return { post_id: postId };
  } catch (e) {
    await tx.rollback();
    throw e;
  }
};

exports.detail = async (postId) => {
  const pool = await getPool();
  const r = await pool.request()
    .input("postId", sql.Int, postId)
    .query(`
      SELECT
        (SELECT COUNT(*) FROM PostReactions WHERE post_id=@postId) AS reactions,
        (SELECT COUNT(*) FROM PostComments  WHERE post_id=@postId) AS comments,
        (SELECT COUNT(*) FROM PostShares    WHERE post_id=@postId) AS shares
    `);
  return r.recordset[0];
};

exports.react = async (postId, userId, emoji) => {
  if (!emoji) throw Object.assign(new Error("emoji is required"), { status: 400 });
  const pool = await getPool();

  // toggle: nếu tồn tại cùng emoji -> xóa; khác emoji -> update; chưa có -> insert
  const existing = await pool.request()
    .input("postId", sql.Int, postId)
    .input("userId", sql.Int, userId)
    .query(`SELECT emoji FROM PostReactions WHERE post_id=@postId AND user_id=@userId`);

  if (existing.recordset[0]) {
    const old = existing.recordset[0].emoji;
    if (old === emoji) {
      await pool.request()
        .input("postId", sql.Int, postId)
        .input("userId", sql.Int, userId)
        .query(`DELETE FROM PostReactions WHERE post_id=@postId AND user_id=@userId`);
      return { toggled: "removed" };
    }
    await pool.request()
      .input("postId", sql.Int, postId)
      .input("userId", sql.Int, userId)
      .input("emoji", sql.NVarChar(20), emoji)
      .query(`UPDATE PostReactions SET emoji=@emoji, updated_at=SYSDATETIME() WHERE post_id=@postId AND user_id=@userId`);
    return { toggled: "updated" };
  }

  await pool.request()
    .input("postId", sql.Int, postId)
    .input("userId", sql.Int, userId)
    .input("emoji", sql.NVarChar(20), emoji)
    .query(`INSERT INTO PostReactions(post_id, user_id, emoji) VALUES(@postId, @userId, @emoji)`);
  return { toggled: "added" };
};

exports.reactors = async (postId) => {
  const pool = await getPool();
  const r = await pool.request()
    .input("postId", sql.Int, postId)
    .query(`
      SELECT u.user_id, u.full_name, u.email, u.avatar_url, pr.emoji, pr.created_at
      FROM PostReactions pr
      JOIN Users u ON u.user_id = pr.user_id
      WHERE pr.post_id=@postId
      ORDER BY pr.created_at DESC
    `);
  return r.recordset;
};

exports.comment = async (postId, userId, content) => {
  if (!content.trim()) throw Object.assign(new Error("content is required"), { status: 400 });
  const pool = await getPool();
  const r = await pool.request()
    .input("postId", sql.Int, postId)
    .input("userId", sql.Int, userId)
    .input("content", sql.NVarChar(1000), content)
    .query(`
      INSERT INTO PostComments(post_id, user_id, content)
      OUTPUT inserted.comment_id
      VALUES(@postId, @userId, @content)
    `);
  return { comment_id: r.recordset[0].comment_id };
};

exports.comments = async (postId) => {
  const pool = await getPool();
  const r = await pool.request()
    .input("postId", sql.Int, postId)
    .query(`
      SELECT c.comment_id, c.content, c.created_at,
             u.user_id, u.full_name, u.avatar_url
      FROM PostComments c
      JOIN Users u ON u.user_id=c.user_id
      WHERE c.post_id=@postId
      ORDER BY c.created_at DESC
    `);
  return r.recordset;
};

exports.commenters = async (postId) => {
  const pool = await getPool();
  const r = await pool.request()
    .input("postId", sql.Int, postId)
    .query(`
      SELECT DISTINCT u.user_id, u.full_name, u.email, u.avatar_url
      FROM PostComments c
      JOIN Users u ON u.user_id=c.user_id
      WHERE c.post_id=@postId
      ORDER BY u.user_id DESC
    `);
  return r.recordset;
};

exports.share = async (postId, userId) => {
  const pool = await getPool();
  // share: 1 user share 1 post 1 lần (PK)
  await pool.request()
    .input("postId", sql.Int, postId)
    .input("userId", sql.Int, userId)
    .query(`
      IF NOT EXISTS (SELECT 1 FROM PostShares WHERE post_id=@postId AND user_id=@userId)
        INSERT INTO PostShares(post_id, user_id) VALUES(@postId, @userId)
    `);
  return { ok: true };
};

exports.sharers = async (postId) => {
  const pool = await getPool();
  const r = await pool.request()
    .input("postId", sql.Int, postId)
    .query(`
      SELECT u.user_id, u.full_name, u.email, u.avatar_url, ps.created_at
      FROM PostShares ps
      JOIN Users u ON u.user_id=ps.user_id
      WHERE ps.post_id=@postId
      ORDER BY ps.created_at DESC
    `);
  return r.recordset;
};