const { getPool } = require('../config/db');

const getPendingActivities = async (userId) => {
  const pool = getPool();
  const query = `
    SELECT 
      ar.request_id AS id,
      a.activity_id,
      a.title AS name,
      a.location,
      ar.created_at AS request_date,
      u.full_name AS creator_name,
      u.avatar_url AS creator_avatar,
      ar.status AS request_status
    FROM activity_requests ar
    INNER JOIN activities a ON ar.activity_id = a.activity_id
    LEFT JOIN users u ON a.creator_id = u.user_id
    WHERE ar.requester_id = $1 AND ar.status = 'pending'
    ORDER BY ar.created_at DESC
  `;
  const result = await pool.query(query, [userId]);
  return result.rows;
};

const getRequestsToApprove = async (userId) => {
  const pool = getPool();
  const query = `
    SELECT 
      ar.request_id AS id,
      a.activity_id,
      a.title AS name,
      a.location,
      ar.created_at AS request_date,
      u.full_name AS requester_name,
      u.avatar_url AS requester_avatar,
      u.user_id AS requester_id,
      ar.status AS request_status
    FROM activity_requests ar
    INNER JOIN activities a ON ar.activity_id = a.activity_id
    LEFT JOIN users u ON ar.requester_id = u.user_id
    WHERE a.creator_id = $1 AND ar.status = 'pending'
    ORDER BY ar.created_at DESC
  `;
  const result = await pool.query(query, [userId]);
  return result.rows;
};

const deleteActivityRequest = async (requestId, userId) => {
  const pool = getPool();
  const query = `
    DELETE FROM activity_requests 
    WHERE request_id = $1 
    AND (
      requester_id = $2 
      OR activity_id IN (SELECT activity_id FROM activities WHERE creator_id = $2)
    )
    RETURNING request_id;
  `;
  const result = await pool.query(query, [requestId, userId]);
  return result.rowCount > 0;
};

const getApprovedActivities = async (page = 1, limit = 15) => {
  const pool = getPool();
  const offset = (page - 1) * limit;
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
      u.username,
      u.full_name,
      u.avatar_url,
      COALESCE(ai.image_url, null) AS image_url
    FROM activities a
    LEFT JOIN users u ON a.creator_id = u.user_id
    LEFT JOIN LATERAL (
        SELECT image_url
        FROM activity_images
        WHERE activity_id = a.activity_id
        ORDER BY is_thumbnail DESC, image_id ASC
        LIMIT 1
    ) ai ON TRUE
    WHERE a.status IN ('active', 'approved', 'pending')
    ORDER BY a.created_at DESC
    LIMIT $1 OFFSET $2
  `;
  const result = await pool.query(query, [limit, offset]);
  return result.rows;
};

const getActivityById = async (activityId) => {
  const pool = getPool();
  const query = `SELECT creator_id, title FROM activities WHERE activity_id = $1`;
  const result = await pool.query(query, [activityId]);
  return result.rows;
};

const checkActivityRequestExists = async (activityId, userId) => {
  const pool = getPool();
  const query = `
    SELECT request_id FROM activity_requests 
    WHERE activity_id = $1 AND requester_id = $2
  `;
  const result = await pool.query(query, [activityId, userId]);
  return result.rows;
};

const getUserInfo = async (userId) => {
  const pool = getPool();
  const query = `SELECT full_name, username FROM users WHERE user_id = $1`;
  const result = await pool.query(query, [userId]);
  return result.rows;
};

const createActivityRequest = async (activityId, userId) => {
  const pool = getPool();
  const query = `
    INSERT INTO activity_requests (activity_id, requester_id, status, created_at)
    VALUES ($1, $2, 'pending', NOW())
    RETURNING request_id;
  `;
  const result = await pool.query(query, [activityId, userId]);
  return result.rows[0].request_id;
};

const approveActivityRequest = async (requestId, userId) => {
  const pool = getPool();
  const query = `
    UPDATE activity_requests ar
    SET status = 'accepted'
    FROM activities a
    WHERE ar.activity_id = a.activity_id
      AND ar.request_id = $1 
      AND ar.status = 'pending'
      AND a.creator_id = $2
    RETURNING ar.activity_id, ar.requester_id
  `;
  const result = await pool.query(query, [requestId, userId]);
  return result.rows[0];
};

const deleteActivity = async (activityId, userId) => {
  const pool = getPool();
  const query = `
    UPDATE activities 
    SET status = 'deleted' 
    WHERE activity_id = $1 AND creator_id = $2 AND status IN ('active', 'approved')
    RETURNING activity_id
  `;
  const result = await pool.query(query, [activityId, userId]);
  return result.rows[0];
};

const rejectActivityRequest = async (requestId, userId) => {
  const pool = getPool();
  const query = `
    UPDATE activity_requests ar
    SET status = 'rejected' 
    FROM activities a
    WHERE ar.activity_id = a.activity_id
      AND ar.request_id = $1 
      AND ar.status = 'pending'
      AND a.creator_id = $2
    RETURNING ar.activity_id, ar.requester_id
  `;
  const result = await pool.query(query, [requestId, userId]);
  return result.rows[0];
};

// Kiểm tra request status của user với activity
const checkActivityRequestStatus = async (activityId, userId) => {
  const pool = getPool();
  const query = `
    SELECT request_id, status 
    FROM activity_requests 
    WHERE activity_id = $1 AND requester_id = $2
  `;
  const result = await pool.query(query, [activityId, userId]);
  return result.rows[0] || null;
};

// Lấy host ID của activity
const getActivityHostId = async (activityId) => {
  const pool = getPool();
  const query = `SELECT creator_id FROM activities WHERE activity_id = $1`;
  const result = await pool.query(query, [activityId]);
  return result.rows[0]?.creator_id || null;
};

const getUserActivities = async (userId) => {
  const pool = getPool();
  const query = `
      SELECT DISTINCT
        a.activity_id AS status_id,
        a.creator_id AS user_id,
        a.title AS content,
        a.description AS extra_content,
        a.location,
        a.max_participants,
        a.duration_minutes,
        a.created_at,
        u.username,
        u.full_name,
        u.avatar_url,
        ai.image_url AS image_url,
        (SELECT COUNT(*) FROM activity_requests WHERE activity_id = a.activity_id AND status = 'accepted') AS participant_count
      FROM activities a
      LEFT JOIN users u ON a.creator_id = u.user_id
      LEFT JOIN LATERAL (
          SELECT image_url
          FROM activity_images
          WHERE activity_id = a.activity_id
          ORDER BY is_thumbnail DESC, image_id ASC
          LIMIT 1
      ) ai ON TRUE
      WHERE (a.creator_id = $1 OR a.activity_id IN (
          SELECT activity_id FROM activity_requests WHERE requester_id = $1 AND status = 'accepted'
      ))
      AND a.status IN ('active', 'approved')
      ORDER BY a.created_at DESC
  `;
  const result = await pool.query(query, [userId]);
  return result.rows;
};

const createActivity = async (activityData) => {
  const pool = getPool();
  const { user_id, title, description, location, max_participants, duration_minutes, status } = activityData;
  
  const query = `
    INSERT INTO activities (creator_id, title, description, location, max_participants, duration_minutes, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING activity_id
  `;
  
  const values = [
    user_id, 
    title, 
    description || '', 
    location || '', 
    max_participants || 1, 
    duration_minutes || 60,
    status || 'active' // Mặc định là active để bỏ qua bước duyệt nếu cần, hoặc pending
  ];
  
  const result = await pool.query(query, values);
  return result.rows[0].activity_id;
};

const saveActivityImages = async (activityId, images) => {
  if (!images || !Array.isArray(images) || images.length === 0) return;
  
  const pool = getPool();
  for (let i = 0; i < images.length; i++) {
    const query = `
      INSERT INTO activity_images (activity_id, image_url, sort_order, is_thumbnail)
      VALUES ($1, $2, $3, $4)
    `;
    await pool.query(query, [activityId, images[i], i, i === 0]);
  }
};

const saveActivityTags = async (activityId, interestIds) => {
  if (!interestIds || !Array.isArray(interestIds) || interestIds.length === 0) return;
  
  const pool = getPool();
  for (const interestId of interestIds) {
    const query = `
      INSERT INTO activity_tags (activity_id, interest_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
    `;
    await pool.query(query, [activityId, interestId]);
  }
};

/**
 * Checks if two users share an accepted activity (one is creator, other is accepted participant OR both are accepted participants)
 */
const getSharedAcceptedActivity = async (user1, user2) => {
  const pool = getPool();
  // Case 1: user1 host, user2 guest
  // Case 2: user2 host, user1 guest
  // Case 3: both guest in same activity
  const query = `
    SELECT activity_id FROM (
      SELECT activity_id FROM activities 
      WHERE creator_id = $1 AND activity_id IN (SELECT activity_id FROM activity_requests WHERE requester_id = $2 AND status = 'accepted')
      UNION
      SELECT activity_id FROM activities 
      WHERE creator_id = $2 AND activity_id IN (SELECT activity_id FROM activity_requests WHERE requester_id = $1 AND status = 'accepted')
      UNION
      SELECT r1.activity_id FROM activity_requests r1
      JOIN activity_requests r2 ON r1.activity_id = r2.activity_id
      WHERE r1.requester_id = $1 AND r1.status = 'accepted'
        AND r2.requester_id = $2 AND r2.status = 'accepted'
    ) AS shared_activities LIMIT 1;
  `;
  const result = await pool.query(query, [user1, user2]);
  return result.rows[0];
};

module.exports = {
  getPendingActivities,
  deleteActivityRequest,
  getApprovedActivities,
  getActivityById,
  checkActivityRequestExists,
  getUserInfo,
  createActivityRequest,
  approveActivityRequest,
  rejectActivityRequest,
  getRequestsToApprove,
  deleteActivity,
  checkActivityRequestStatus,
  getActivityHostId,
  getUserActivities,
  createActivity,
  saveActivityImages,
  saveActivityTags,
  getSharedAcceptedActivity
};
