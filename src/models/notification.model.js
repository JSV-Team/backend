const { getPool } = require('../config/db');

const getNotificationsByUserId = async (userId, limit = 50) => {
    try {
        const pool = getPool();
        const query = `
      SELECT
        notification_id,
        user_id,
        type,
        ref_id,
        content,
        is_read,
        created_at
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;
        const result = await pool.query(query, [userId, limit]);
        console.log(`📬 getNotificationsByUserId for userId=${userId}: Found ${result.rows.length} records`);
        return result.rows;
    } catch (error) {
        console.error('❌ Error in getNotificationsByUserId:', error.message);
        throw error;
    }
};

const getUnreadCount = async (userId) => {
    try {
        const pool = getPool();
        const query = `
      SELECT COUNT(*) as count
      FROM notifications
      WHERE user_id = $1 AND is_read = false
    `;
        const result = await pool.query(query, [userId]);
        const count = result.rows && result.rows.length > 0 ? parseInt(result.rows[0].count) : 0;
        console.log(`📬 getUnreadCount for userId=${userId}: ${count} unread`);
        return count;
    } catch (error) {
        console.error('❌ Error in getUnreadCount:', error.message);
        throw error;
    }
};

const createNotification = async (userId, type, content, refId = null) => {
    const pool = getPool();
    const query = `
      INSERT INTO notifications (user_id, type, content, ref_id, is_read, created_at)
      VALUES ($1, $2, $3, $4, false, NOW())
      RETURNING notification_id;
    `;
    const result = await pool.query(query, [userId, type, content, refId]);
    return result.rows[0].notification_id;
};

const markAsRead = async (notificationId) => {
    const pool = getPool();
    const query = `
      UPDATE notifications
      SET is_read = true
      WHERE notification_id = $1
    `;
    await pool.query(query, [notificationId]);
};

const markAllAsRead = async (userId) => {
    const pool = getPool();
    const query = `
      UPDATE notifications
      SET is_read = true
      WHERE user_id = $1 AND is_read = false
    `;
    await pool.query(query, [userId]);
};

const deleteNotification = async (notificationId) => {
    const pool = getPool();
    const query = `
      DELETE FROM notifications
      WHERE notification_id = $1
    `;
    await pool.query(query, [notificationId]);
};

module.exports = {
    getNotificationsByUserId,
    getUnreadCount,
    createNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification
};

