const { getPool } = require("../config/db");
const bannedKeywordModel = require('../models/bannedKeyword.model');

/**
 * Lấy tất cả bài đăng (feed) - Activities và DailyStatus từ tất cả users
 */
exports.listAll = async (page = 1, limit = 15) => {
  const pool = getPool();
  const offset = (page - 1) * limit;

  const query = `
    WITH combined_posts AS (
      SELECT 
        a.activity_id AS post_id, 
        a.creator_id AS creator_id, 
        a.title AS content, 
        a.description AS extra_content, 
        a.location, 
        a.duration_minutes, 
        a.max_participants, 
        a.created_at,
        (SELECT json_agg(image_url ORDER BY sort_order) FROM activity_images WHERE activity_id = a.activity_id) AS images,
        (SELECT image_url FROM activity_images WHERE activity_id = a.activity_id ORDER BY sort_order LIMIT 1) AS image_url,
        'activity' AS post_type
      FROM activities a
      WHERE a.status = 'active'
      
      UNION ALL
      
      SELECT 
        s.status_id AS post_id, 
        s.user_id AS creator_id, 
        s.content, 
        '' AS extra_content, 
        '' AS location, 
        NULL AS duration_minutes, 
        NULL AS max_participants, 
        s.created_at,
        CASE WHEN s.image_url IS NOT NULL THEN json_build_array(s.image_url) ELSE NULL END AS images,
        s.image_url,
        'status' AS post_type
      FROM daily_status s
      WHERE s.expires_at > NOW()
    )
    SELECT 
      cp.post_id, 
      cp.creator_id AS user_id, 
      cp.content, 
      cp.extra_content, 
      cp.location, 
      cp.duration_minutes, 
      cp.max_participants, 
      cp.created_at, 
      cp.image_url, 
      cp.images,
      cp.post_type,
      u.full_name, 
      u.avatar_url,
      0 AS reactions_count,
      0 AS comments_count,
      0 AS shares_count
    FROM combined_posts cp
    JOIN users u ON u.user_id = cp.creator_id
    ORDER BY cp.created_at DESC
    LIMIT $1 OFFSET $2
  `;
  const r = await pool.query(query, [limit, offset]);
  return r.rows;
};

/**
 * Lấy danh sách bài đăng của 1 user (bao gồm Activities và DailyStatus)
 */
exports.listByUser = async (userId, page = 1, limit = 15) => {
  const pool = getPool();
  const offset = (page - 1) * limit;

  // Combine activities and daily_status to show in profile 'posts' tab
  const query = `
        WITH combined_posts AS (
            SELECT 
                a.activity_id AS post_id, 
                a.creator_id AS creator_id, 
                a.title AS content, 
                a.description AS extra_content, 
                a.location, 
                a.duration_minutes, 
                a.max_participants, 
                a.created_at,
                (SELECT json_agg(image_url ORDER BY sort_order) FROM activity_images WHERE activity_id = a.activity_id) AS images,
                (SELECT image_url FROM activity_images WHERE activity_id = a.activity_id ORDER BY sort_order LIMIT 1) AS image_url,
                'activity' AS post_type
            FROM activities a
            WHERE a.creator_id = $1 AND a.status = 'active'
            
            UNION ALL
            
            SELECT 
                s.status_id AS post_id, 
                s.user_id AS creator_id, 
                s.content, 
                '' AS extra_content, 
                '' AS location, 
                NULL AS duration_minutes, 
                NULL AS max_participants, 
                s.created_at,
                CASE WHEN s.image_url IS NOT NULL THEN json_build_array(s.image_url) ELSE NULL END AS images,
                s.image_url,
                'status' AS post_type
            FROM daily_status s
            WHERE s.user_id = $1
        )
        SELECT 
            cp.post_id, 
            cp.creator_id AS user_id, 
            cp.content, 
            cp.extra_content, 
            cp.location, 
            cp.duration_minutes, 
            cp.max_participants, 
            cp.created_at, 
            cp.image_url, 
            cp.images,
            cp.post_type,
            u.full_name, 
            u.avatar_url,
            0 AS reactions_count,
            0 AS comments_count,
            0 AS shares_count
        FROM combined_posts cp
        JOIN users u ON u.user_id = cp.creator_id
        ORDER BY cp.created_at DESC
        LIMIT $2 OFFSET $3
    `;
  const r = await pool.query(query, [userId, limit, offset]);
  return r.rows;
};

/**
 * Tạo bài đăng mới (vào bảng activities)
 */
exports.createPost = async (userId, payload) => {
  console.log(`[posts.service] createPost - userId: ${userId} (${typeof userId})`);

  if (payload.duration_minutes !== undefined && payload.duration_minutes !== null) {
    if (Number(payload.duration_minutes) <= 0) {
      throw new Error('Thời lượng phải là số dương lớn hơn 0');
    }
  }

  const descriptionCheck = payload.description || payload.desc || "";
  if (descriptionCheck.length > 3000) {
    throw new Error('Văn bản mô tả quá dài (tối đa 3000 ký tự)');
  }

  // Banned keyword check
  let textToCheck = (payload.title || '') + ' ' + descriptionCheck + ' ' + (payload.location || '');
  textToCheck = textToCheck.toLowerCase();

  const bannedKeywords = await bannedKeywordModel.getAllBannedKeywords();
  const foundBannedWord = bannedKeywords.find(kw => kw && textToCheck.includes(kw.toLowerCase()));

  if (foundBannedWord) {
    throw new Error('Vi phạm từ ngữ đăng bài');
  }

  const pool = getPool();
  const client = await pool.connect();

  const { media = [] } = payload;

  try {
    await client.query('BEGIN');

    const insPostQuery = `
        INSERT INTO activities(creator_id, title, description, location, duration_minutes, max_participants, status)
        VALUES ($1, $2, $3, $4, $5, $6, 'active')
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
    for (const m of media) {
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

/**
 * Tạo DailyStatus
 */
exports.createStatus = async (userId, payload) => {
  const pool = getPool();
  const { title, content, description, media = [] } = payload;
  const imageUrl = media.length > 0 ? media[0].url : (payload.image_url || null);
  const statusContent = title || content || description || "";

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 1);

  const query = `
    INSERT INTO daily_status (user_id, content, image_url, expires_at, created_at)
    VALUES ($1, $2, $3, $4, NOW())
    RETURNING status_id
  `;
  const r = await pool.query(query, [userId, statusContent, imageUrl, expiresAt]);
  return { status_id: r.rows[0].status_id };
};

/**
 * Xóa activity (mềm)
 */
exports.deletePost = async (postId, userId) => {
  const pool = getPool();

  // Check post exists and verify ownership
  const check = await pool.query(
    'SELECT creator_id FROM activities WHERE activity_id = $1',
    [postId]
  );

  if (check.rows.length === 0) {
    const err = new Error('Không tìm thấy bài viết');
    err.status = 404;
    throw err;
  }

  if (check.rows[0].creator_id !== userId) {
    const err = new Error('Bạn không có quyền xóa bài viết này');
    err.status = 403;
    throw err;
  }

  await pool.query(
    "UPDATE activities SET status = 'deleted' WHERE activity_id = $1 AND creator_id = $2",
    [postId, userId]
  );
  return { ok: true };
};

/**
 * Xóa status
 */
exports.deleteStatus = async (statusId, userId) => {
  const pool = getPool();
  await pool.query(
    "DELETE FROM daily_status WHERE status_id = $1 AND user_id = $2",
    [statusId, userId]
  );
  return { ok: true };
};

/**
 * Lấy detail post (stats)
 */
exports.detail = async (postId) => {
  const pool = getPool();
  const query = `
      SELECT
        (SELECT COUNT(*) FROM post_reactions WHERE post_id = $1) AS reactions,
        (SELECT COUNT(*) FROM post_comments  WHERE post_id = $1) AS comments,
        (SELECT COUNT(*) FROM post_shares    WHERE post_id = $1) AS shares
    `;
  const r = await pool.query(query, [postId]);
  return r.rows[0];
};

/**
 * Reaction (Toggle)
 */
exports.react = async (postId, userId, emoji) => {
  if (!emoji) throw Object.assign(new Error("emoji is required"), { status: 400 });
  const pool = getPool();

  const existingResult = await pool.query(
    `SELECT emoji FROM post_reactions WHERE post_id = $1 AND user_id = $2`,
    [postId, userId]
  );

  if (existingResult.rows.length > 0) {
    const old = existingResult.rows[0].emoji;
    if (old === emoji) {
      await pool.query(
        `DELETE FROM post_reactions WHERE post_id = $1 AND user_id = $2`,
        [postId, userId]
      );
      return { toggled: "removed" };
    }
    await pool.query(
      `UPDATE post_reactions SET emoji = $1, updated_at = NOW() WHERE post_id = $2 AND user_id = $3`,
      [emoji, postId, userId]
    );
    return { toggled: "updated" };
  }

  await pool.query(
    `INSERT INTO post_reactions(post_id, user_id, emoji) VALUES($1, $2, $3)`,
    [postId, userId, emoji]
  );
  return { toggled: "added" };
};

exports.reactors = async (postId) => {
  const pool = getPool();
  const query = `
      SELECT u.user_id, u.full_name, u.email, u.avatar_url, pr.emoji, pr.created_at
      FROM post_reactions pr
      JOIN users u ON u.user_id = pr.user_id
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
      INSERT INTO post_comments(post_id, user_id, content)
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
      FROM post_comments c
      JOIN users u ON u.user_id = c.user_id
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
      FROM post_comments c
      JOIN users u ON u.user_id = c.user_id
      WHERE c.post_id = $1
      ORDER BY u.user_id DESC
    `;
  const r = await pool.query(query, [postId]);
  return r.rows;
};

exports.share = async (postId, userId) => {
  const pool = getPool();
  await pool.query(`
      INSERT INTO post_shares(post_id, user_id)
      VALUES($1, $2)
      ON CONFLICT (post_id, user_id) DO NOTHING
    `, [postId, userId]);
  return { ok: true };
};

exports.sharers = async (postId) => {
  const pool = getPool();
  const query = `
      SELECT u.user_id, u.full_name, u.email, u.avatar_url, ps.created_at
      FROM post_shares ps
      JOIN users u ON u.user_id = ps.user_id
      WHERE ps.post_id = $1
      ORDER BY ps.created_at DESC
    `;
  const r = await pool.query(query, [postId]);
  return r.rows;
};
