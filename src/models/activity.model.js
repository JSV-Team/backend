const { getPool } = require('../config/db');
const sql = require('mssql');

const getPendingActivities = async (userId) => {
  const pool = getPool();
  const result = await pool.request()
    .input('userId', sql.Int, userId)
    .query(`
      SELECT 
        ar.request_id AS id,
        a.activity_id,
        a.title AS name,
        a.location,
        ar.created_at AS request_date,
        u.full_name AS creator_name,
        u.avatar_url AS creator_avatar,
        ar.status AS request_status
      FROM ActivityRequests ar
      INNER JOIN Activities a ON ar.activity_id = a.activity_id
      LEFT JOIN Users u ON a.creator_id = u.user_id
      WHERE ar.requester_id = @userId AND ar.status = 'pending'
      ORDER BY ar.created_at DESC
    `);
  return result.recordset;
};

const getRequestsToApprove = async (userId) => {
  const pool = getPool();
  const result = await pool.request()
    .input('userId', sql.Int, userId)
    .query(`
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
      FROM ActivityRequests ar
      INNER JOIN Activities a ON ar.activity_id = a.activity_id
      LEFT JOIN Users u ON ar.requester_id = u.user_id
      WHERE a.creator_id = @userId AND ar.status = 'pending'
      ORDER BY ar.created_at DESC
    `);
  return result.recordset;
};

const deleteActivityRequest = async (requestId) => {
  const pool = getPool();
  await pool.request()
    .input('id', sql.Int, requestId)
    .query(`DELETE FROM ActivityRequests WHERE request_id = @id`);
};

const getApprovedActivities = async () => {
  const pool = getPool();
  try {
    const result = await pool.request().query(`
      SELECT TOP 50
        a.activity_id AS status_id,
        a.creator_id AS user_id,
        a.title,
        a.description,
        a.location,
        a.max_participants,
        a.duration_minutes,
        a.created_at,
        u.username,
        u.full_name,
        u.avatar_url,
        ai.image_url AS image_url
      FROM Activities a
      LEFT JOIN Users u ON a.creator_id = u.user_id
      OUTER APPLY (
        SELECT TOP 1 image_url 
        FROM ActivityImages 
        WHERE activity_id = a.activity_id 
        ORDER BY created_at DESC
      ) ai
      WHERE a.status = 'active'
      ORDER BY a.created_at DESC
    `);
    return result.recordset;
  } catch (error) {
    console.error('getApprovedActivities MODEL ERROR:', error.message);
    throw error;
  }
};

const getActivityById = async (activityId) => {
  const pool = getPool();
  const result = await pool.request()
    .input('activityId', sql.Int, activityId)
    .query(`SELECT creator_id, title FROM Activities WHERE activity_id = @activityId`);
  return result.recordset;
};

const checkActivityRequestExists = async (activityId, userId) => {
  const pool = getPool();
  const result = await pool.request()
    .input('activityId', sql.Int, activityId)
    .input('userId', sql.Int, userId)
    .query(`
      SELECT request_id FROM ActivityRequests 
      WHERE activity_id = @activityId AND requester_id = @userId
    `);
  return result.recordset;
};

const getUserInfo = async (userId) => {
  const pool = getPool();
  const result = await pool.request()
    .input('userId', sql.Int, userId)
    .query(`SELECT full_name, username FROM Users WHERE user_id = @userId`);
  return result.recordset;
};

const createActivityRequest = async (activityId, userId) => {
  const pool = getPool();
  const result = await pool.request()
    .input('activityId', sql.Int, activityId)
    .input('userId', sql.Int, userId)
    .query(`
      INSERT INTO ActivityRequests (activity_id, requester_id, status, created_at)
      VALUES (@activityId, @userId, 'pending', SYSDATETIME());
      SELECT SCOPE_IDENTITY() AS request_id;
    `);
  return result.recordset[0].request_id;
};

const approveActivityRequest = async (requestId) => {
  const pool = getPool();
  const result = await pool.request()
    .input('id', sql.Int, requestId)
    .query(`
      UPDATE ActivityRequests 
      SET status = 'accepted' 
      OUTPUT INSERTED.activity_id, INSERTED.requester_id
      WHERE request_id = @id AND status = 'pending'
    `);
  return result.recordset[0];
};

const rejectActivityRequest = async (requestId) => {
  const pool = getPool();
  const result = await pool.request()
    .input('id', sql.Int, requestId)
    .query(`
      UPDATE ActivityRequests 
      SET status = 'rejected' 
      OUTPUT INSERTED.activity_id, INSERTED.requester_id
      WHERE request_id = @id AND status = 'pending'
    `);
  return result.recordset[0];
}
const deleteActivity = async (activityId, userId) => {
  const pool = getPool();
  const result = await pool.request()
    .input('activityId', sql.Int, activityId)
    .input('userId', sql.Int, userId)
    .query(`
      UPDATE Activities 
      SET status = 'deleted' 
      OUTPUT INSERTED.activity_id
      WHERE activity_id = @activityId AND creator_id = @userId AND status = 'active'
    `);
  return result.recordset[0];
};

const createActivity = async (activityData) => {
  const pool = getPool();
  const result = await pool.request()
    .input('creatorId', sql.Int, activityData.user_id)
    .input('title', sql.NVarChar, activityData.title)
    .input('description', sql.NVarChar, activityData.description || '')
    .input('location', sql.NVarChar, activityData.location || null)
    .input('maxParticipants', sql.Int, activityData.max_participants || 10)
    .input('durationMinutes', sql.Int, activityData.duration || null)
    .query(`
      INSERT INTO Activities (creator_id, title, description, location, max_participants, duration_minutes, status, created_at)
      VALUES (@creatorId, @title, @description, @location, @maxParticipants, @durationMinutes, 'active', SYSDATETIME());
      SELECT SCOPE_IDENTITY() AS activity_id;
    `);
    
  const newActivityId = result.recordset[0].activity_id;

  if (activityData.image_url) {
    await pool.request()
      .input('activityId', sql.Int, newActivityId)
      .input('imageUrl', sql.NVarChar, activityData.image_url)
      .query(`
        INSERT INTO ActivityImages (activity_id, image_url, created_at)
        VALUES (@activityId, @imageUrl, SYSDATETIME());
      `);
  }

  return newActivityId;
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
  getRequestsToApprove,
  rejectActivityRequest,
  deleteActivity,
  createActivity
};
