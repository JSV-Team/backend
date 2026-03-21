const { getPool } = require('../config/db');

/**
 * Thêm bài viết mới
 */
const insertPost = async (userId, content, imageUrl = null, additionalData = {}) => {
  const pool = getPool();
  const { description = '', location = '', maxParticipants = 10, duration = 60 } = additionalData;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const query = `
      INSERT INTO activities (creator_id, title, description, location, max_participants, duration_minutes, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, 'approved', NOW())
      RETURNING activity_id;
    `;
    const values = [userId, content, description, location, maxParticipants, duration];
    
    const result = await client.query(query, values);
    const activityId = result.rows[0].activity_id;

    if (imageUrl) {
      await client.query(`
        INSERT INTO activity_images (activity_id, image_url, is_thumbnail)
        VALUES ($1, $2, true)
      `, [activityId, imageUrl]);
    }
    
    await client.query('COMMIT');
    console.log('Post created with ID:', activityId);
    return activityId;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('insertPost error:', error.message);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Lấy bài viết theo ID
 */
const getPostById = async (activityId) => {
  const pool = getPool();
  try {
    const query = `
      SELECT
        a.activity_id AS status_id,
        a.creator_id AS user_id,
        a.title AS content,
        a.description AS extra_content,
        a.location,
        a.max_participants,
        a.created_at,
        COALESCE(ai.image_url, null) AS image_url,
        u.username,
        u.full_name,
        u.avatar_url
      FROM activities a
      LEFT JOIN users u ON a.creator_id = u.user_id
      LEFT JOIN activity_images ai ON a.activity_id = ai.activity_id AND ai.is_thumbnail = true
      WHERE a.activity_id = $1
    `;
    const result = await pool.query(query, [activityId]);
    return result.rows[0];
  } catch (error) {
    console.error('getPostById error:', error.message);
    throw error;
  }
};

/**
 * Lấy tất cả bài viết
 */
const getAllPosts = async (limit = 50) => {
  const pool = getPool();
  try {
    const query = `
      SELECT
        a.activity_id AS status_id,
        a.creator_id AS user_id,
        a.title AS content,
        a.description AS extra_content,
        a.location,
        a.max_participants,
        a.duration_minutes,
        a.created_at,
        img.image_url,
        u.username,
        u.full_name,
        u.avatar_url
      FROM activities a
      LEFT JOIN users u ON a.creator_id = u.user_id
      LEFT JOIN LATERAL (
        SELECT image_url 
        FROM activity_images 
        WHERE activity_id = a.activity_id 
        ORDER BY is_thumbnail DESC, sort_order ASC
        LIMIT 1
      ) img ON TRUE
      WHERE a.status = 'active'
      ORDER BY a.created_at DESC
      LIMIT $1
    `;
    const result = await pool.query(query, [limit]);
    return result.rows;
  } catch (error) {
    console.error('getAllPosts error:', error.message);
    throw error;
  }
};

module.exports = { insertPost, getPostById, getAllPosts };
