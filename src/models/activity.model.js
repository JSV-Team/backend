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

const deleteActivityRequest = async (requestId) => {
  const pool = getPool();
  await pool.request()
    .input('id', sql.Int, requestId)
    .query(`DELETE FROM ActivityRequests WHERE request_id = @id`);
};

const getApprovedActivities = async () => {
  const pool = getPool();
  const result = await pool.request().query(`
    SELECT TOP 50
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
      (SELECT TOP 1 ai.image_url FROM ActivityImages ai WHERE ai.activity_id = a.activity_id) AS image_url
    FROM Activities a
    LEFT JOIN Users u ON a.creator_id = u.user_id
    WHERE a.status IN ('approved', 'active')
    ORDER BY a.created_at DESC
  `);
  return result.recordset;
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

module.exports = {
  getPendingActivities,
  deleteActivityRequest,
  getApprovedActivities,
  getActivityById,
  checkActivityRequestExists,
  getUserInfo,
  createActivityRequest
};
