const { getPool } = require('../config/db');
const sql = require('mssql');

const insertPost = async (userId, content, imageUrl = null, additionalData = {}) => {

  const pool = getPool();
  const { description = '', location = '', maxParticipants = 10, duration = 60 } = additionalData;

  try {
    const result = await pool.request()
      .input('creatorId', sql.Int, userId)
      .input('title', sql.NVarChar(sql.MAX), content)
      .input('description', sql.NVarChar(sql.MAX), description)
      .input('location', sql.NVarChar(100), location)
      .input('maxParticipants', sql.Int, maxParticipants)
      .input('duration', sql.Int, duration)
      .input('imageUrl', sql.NVarChar(1000), imageUrl || null)
      .query(`
        INSERT INTO Activities (creator_id, title, description, location, max_participants, duration_minutes, image_url, status, created_at)
        VALUES (@creatorId, @title, @description, @location, @maxParticipants, @duration, @imageUrl, 'approved', SYSDATETIME());
        SELECT SCOPE_IDENTITY() AS activity_id;
      `);

    const activityId = result.recordset[0].activity_id;
    console.log('Post created with ID:', activityId, '| image saved to ActivityImages:', imageUrl);
    return activityId;
  } catch (error) {
    console.error('insertPost error:', error.message);
    throw error;
  }
};

// Lấy bài viết theo ID
const getPostById = async (activityId) => {
  const pool = getPool();
  try {
    const result = await pool.request()
      .input('activityId', sql.Int, activityId)
      .query(`
        SELECT
          a.activity_id AS status_id,
          a.creator_id AS user_id,
          a.title AS content,
          a.description AS extra_content,
          a.location,
          a.max_participants,
          a.created_at,
          COALESCE(ai.image_url, a.image_url) AS image_url,
          u.username,
          u.full_name,
          u.avatar_url
        FROM Activities a
        LEFT JOIN Users u ON a.creator_id = u.user_id
        LEFT JOIN ActivityImages ai ON a.activity_id = ai.activity_id AND ai.is_thumbnail = 1
        WHERE a.activity_id = @activityId
      `);
    return result.recordset[0];
  } catch (error) {
    console.error('getPostById error:', error.message);
    throw error;
  }
};

// Lấy tất cả bài viết
const getAllPosts = async (limit = 50) => {
  const pool = getPool();
  try {
    const result = await pool.request()
      .input('limit', sql.Int, limit)
      .query(`
        SELECT TOP(@limit)
          a.activity_id AS status_id,
          a.creator_id AS user_id,
          a.title AS content,
          a.description AS extra_content,
          a.location,
          a.max_participants,
          a.duration_minutes,
          a.created_at,
          COALESCE(ai.image_url, a.image_url) AS image_url,
          u.username,
          u.full_name,
          u.avatar_url
        FROM Activities a
        LEFT JOIN Users u ON a.creator_id = u.user_id
        OUTER APPLY (
          SELECT TOP 1 image_url 
          FROM ActivityImages 
          WHERE activity_id = a.activity_id 
          ORDER BY is_thumbnail DESC, sort_order ASC
        ) img
        WHERE a.status = 'active'
        ORDER BY a.created_at DESC
      `);
    return result.recordset;
  } catch (error) {
    console.error('getAllPosts error:', error.message);
    throw error;
  }
};

module.exports = { insertPost, getPostById, getAllPosts };
