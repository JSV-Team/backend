const { getPool } = require('../config/db');
const sql = require('mssql');

const setMatchingEnabled = async (userId, enabled) => {
    const pool = getPool();
    await pool.request()
        .input('userId', sql.Int, userId)
        .input('enabled', sql.Bit, enabled ? 1 : 0)
        .query(`
            UPDATE Users
            SET is_matching_enabled = @enabled
            WHERE user_id = @userId
        `);
};

const isMatchingEnabled = async (userId) => {
    const pool = getPool();
    const result = await pool.request()
        .input('userId', sql.Int, userId)
        .query(`
            SELECT is_matching_enabled FROM Users WHERE user_id = @userId
        `);
    return result.recordset[0]?.is_matching_enabled;
};

const updateLastMatchedAt = async (userId) => {
    const pool = getPool();
    await pool.request()
        .input('userId', sql.Int, userId)
        .query(`
            UPDATE Users
            SET last_matched_at = SYSDATETIME()
            WHERE user_id = @userId
        `);
};

const getLastMatchedAt = async (userId) => {
    const pool = getPool();
    const result = await pool.request()
        .input('userId', sql.Int, userId)
        .query(`
            SELECT last_matched_at FROM Users WHERE user_id = @userId
        `);
    return result.recordset[0]?.last_matched_at;
};

module.exports = {
    setMatchingEnabled,
    isMatchingEnabled,
    updateLastMatchedAt,
    getLastMatchedAt
};
