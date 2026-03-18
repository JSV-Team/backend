const { getPool } = require("../config/db");
const bannedKeywordModel = require('../models/bannedKeyword.model');

exports.listByUser = async (userId) => {
  const pool = getPool();
  const query = `
      SELECT a.activity_id AS post_id, a.creator_id AS user_id, 
             a.title AS content, a.description, a.location, 
             a.duration_minutes, a.max_participants, a.created_at,
             (SELECT image_url FROM activity_images WHERE activity_id = a.activity_id LIMIT 1) AS image_url
      FROM activities a
      WHERE a.creator_id = $1
      ORDER BY a.created_at DESC
    `;
  const r = await pool.query(query, [userId]);
  return r.rows;
};

exports.createPost = async (userId, payload) => {
  console.log(`[posts.service] createPost - userId: ${userId} (${typeof userId})`);

  // Banned keyword check
  let textToCheck = (payload.title || '') + ' ' + (payload.description || payload.desc || '') + ' ' + (payload.location || '');
  textToCheck = textToCheck.toLowerCase();

  const bannedKeywords = await bannedKeywordModel.getAllBannedKeywords();
  const foundBannedWord = bannedKeywords.find(keyword => keyword && textToCheck.includes(keyword.toLowerCase()));

  if (foundBannedWord) {
    throw new Error('Vi phạm từ ngữ đăng bài');
  }

  const pool = getPool();
  const client = await pool.connect();

  const { content, privacy = "public", tags = [], media = [], is_featured = 0 } = payload;

  try {
    await client.query('BEGIN');

    const insPostQuery = `
        INSERT INTO activities(creator_id, title, description, location, duration_minutes, max_participants)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING activity_id
      `;
    const insPostValues = [
      userId, 
      payload.title || payload.content || "Không tiêu đề", 
      payload.description || payload.desc || "", 
      payload.location || null, 
      payload.duration_minutes || null, 
      payload.max_participants || null
    ];
    const insPost = await client.query(insPostQuery, insPostValues);
    const postId = insPost.rows[0].activity_id;

    // media (nếu có)
    for (const m of media || []) {
      if (!m?.url) continue;
      await client.query(
        `INSERT INTO activity_images(activity_id, image_url) VALUES($1, $2)`, 
        [postId, m.url]
      );
    }

    await client.query('COMMIT');
    return { post_id: postId };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};

exports.detail = async (postId) => {
  const pool = getPool();
  const query = `
      SELECT
        (SELECT COUNT(*) FROM PostReactions WHERE post_id = $1) AS reactions,
        (SELECT COUNT(*) FROM PostComments  WHERE post_id = $1) AS comments,
        (SELECT COUNT(*) FROM PostShares    WHERE post_id = $1) AS shares
    `;
  const r = await pool.query(query, [postId]);
  return r.rows[0];
};

exports.react = async (postId, userId, emoji) => {
  if (!emoji) throw Object.assign(new Error("emoji is required"), { status: 400 });
  const pool = getPool();

  // toggle: nếu tồn tại cùng emoji -> xóa; khác emoji -> update; chưa có -> insert
  const existingResult = await pool.query(
    `SELECT emoji FROM PostReactions WHERE post_id = $1 AND user_id = $2`, 
    [postId, userId]
  );

  if (existingResult.rows.length > 0) {
    const old = existingResult.rows[0].emoji;
    if (old === emoji) {
      await pool.query(
        `DELETE FROM PostReactions WHERE post_id = $1 AND user_id = $2`, 
        [postId, userId]
      );
      return { toggled: "removed" };
    }
    await pool.query(
      `UPDATE PostReactions SET emoji = $1, updated_at = NOW() WHERE post_id = $2 AND user_id = $3`, 
      [emoji, postId, userId]
    );
    return { toggled: "updated" };
  }

  await pool.query(
    `INSERT INTO PostReactions(post_id, user_id, emoji) VALUES($1, $2, $3)`, 
    [postId, userId, emoji]
  );
  return { toggled: "added" };
};

exports.reactors = async (postId) => {
  const pool = getPool();
  const query = `
      SELECT u.user_id, u.full_name, u.email, u.avatar_url, pr.emoji, pr.created_at
      FROM PostReactions pr
      JOIN Users u ON u.user_id = pr.user_id
      WHERE pr.post_id = $1
      ORDER BY pr.created_at DESC
    `;
  const r = await pool.query(query, [postId]);
  return r.rows;
};

exports.comment = async (postId, userId, content) => {
  if (!content.trim()) throw Object.assign(new Error("content is required"), { status: 400 });
  const pool = getPool();
  const query = `
      INSERT INTO PostComments(post_id, user_id, content)
      VALUES($1, $2, $3)
      RETURNING comment_id
    `;
  const r = await pool.query(query, [postId, userId, content]);
  return { comment_id: r.rows[0].comment_id };
};

exports.comments = async (postId) => {
  const pool = getPool();
  const query = `
      SELECT c.comment_id, c.content, c.created_at,
             u.user_id, u.full_name, u.avatar_url
      FROM PostComments c
      JOIN Users u ON u.user_id = c.user_id
      WHERE c.post_id = $1
      ORDER BY c.created_at DESC
    `;
  const r = await pool.query(query, [postId]);
  return r.rows;
};

exports.commenters = async (postId) => {
  const pool = getPool();
  const query = `
      SELECT DISTINCT u.user_id, u.full_name, u.email, u.avatar_url
      FROM PostComments c
      JOIN Users u ON u.user_id = c.user_id
      WHERE c.post_id = $1
      ORDER BY u.user_id DESC
    `;
  const r = await pool.query(query, [postId]);
  return r.rows;
};

exports.share = async (postId, userId) => {
  const pool = getPool();
  // share: 1 user share 1 post 1 lần
  await pool.query(`
      INSERT INTO PostShares(post_id, user_id) 
      VALUES($1, $2)
      ON CONFLICT (post_id, user_id) DO NOTHING
    `, [postId, userId]);
  return { ok: true };
};

exports.sharers = async (postId) => {
  const pool = getPool();
  const query = `
      SELECT u.user_id, u.full_name, u.email, u.avatar_url, ps.created_at
      FROM PostShares ps
      JOIN Users u ON u.user_id = ps.user_id
      WHERE ps.post_id = $1
      ORDER BY ps.created_at DESC
    `;
  const r = await pool.query(query, [postId]);
  return r.rows;
};