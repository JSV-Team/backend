const { getPool } = require('../config/db');
const sql = require('mssql');

const getNotificationsByUserId = async (userId, limit = 50) => {
    const pool = getPool();
    const result = await pool.request()
        .input('userId', sql.Int, userId)
        .input('limit', sql.Int, limit)
        .query(`
      SELECT TOP (@limit)
        notification_id,
        user_id,
        type,
        ref_id,
        content,
        is_read,
        created_at
      FROM Notifications
      WHERE user_id = @userId
      ORDER BY created_at DESC
    `);
    return result.recordset;
};

const getUnreadCount = async (userId) => {
    const pool = getPool();
    const result = await pool.request()
        .input('userId', sql.Int, userId)
        .query(`
      SELECT COUNT(*) as count
      FROM Notifications
      WHERE user_id = @userId AND is_read = 0
    `);
    return result.recordset[0].count;
};

const createNotification = async (userId, type, content, refId = null) => {
    const pool = getPool();
    const result = await pool.request()
        .input('userId', sql.Int, userId)
        .input('type', sql.VarChar(50), type)
        .input('content', sql.NVarChar(500), content)
        .input('refId', sql.Int, refId)
        .query(`
      INSERT INTO Notifications (user_id, type, content, ref_id, is_read, created_at)
      VALUES (@userId, @type, @content, @refId, 0, SYSDATETIME());
      SELECT SCOPE_IDENTITY() AS notification_id;
    `);
    return result.recordset[0].notification_id;
};

const markAsRead = async (notificationId) => {
    const pool = getPool();
    await pool.request()
        .input('notificationId', sql.Int, notificationId)
        .query(`
      UPDATE Notifications
      SET is_read = 1
      WHERE notification_id = @notificationId
    `);
};

const markAllAsRead = async (userId) => {
    const pool = getPool();
    await pool.request()
        .input('userId', sql.Int, userId)
        .query(`
      UPDATE Notifications
      SET is_read = 1
      WHERE user_id = @userId AND is_read = 0
    `);
};

const deleteNotification = async (notificationId) => {
    const pool = getPool();
    await pool.request()
        .input('notificationId', sql.Int, notificationId)
        .query(`
      DELETE FROM Notifications
      WHERE notification_id = @notificationId
    `);
};

module.exports = {
    getNotificationsByUserId,
    getUnreadCount,
    createNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification
};
