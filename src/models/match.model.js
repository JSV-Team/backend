const { getPool } = require('../config/db');
const sql = require('mssql');

const createMatchSession = async (user_id_1, user_id_2) => {
    const pool = getPool();
    const result = await pool.request()
        .input('u1', sql.Int, user_id_1)
        .input('u2', sql.Int, user_id_2)
        .query(`
            INSERT INTO MatchSessions (user_one, user_two, match_type, requested_by, status, created_at)
            VALUES (@u1, @u2, 'auto', @u1, 'active', SYSDATETIME());
            SELECT SCOPE_IDENTITY() AS match_id;
        `);
    return result.recordset[0].match_id;
};

const getMatchSessionByUsers = async (user_id_1, user_id_2) => {
    const pool = getPool();
    const result = await pool.request()
        .input('u1', sql.Int, user_id_1)
        .input('u2', sql.Int, user_id_2)
        .query(`
            SELECT * FROM MatchSessions
            WHERE (user_one = @u1 AND user_two = @u2)
               OR (user_one = @u2 AND user_two = @u1)
        `);
    return result.recordset[0];
};

const getActiveMatchSessions = async (userId) => {
    const pool = getPool();
    const result = await pool.request()
        .input('userId', sql.Int, userId)
        .query(`
            SELECT * FROM MatchSessions
            WHERE (user_one = @userId OR user_two = @userId)
              AND status = 'active'
        `);
    return result.recordset;
};

const isUserInActiveMatch = async (userId) => {
    const sessions = await getActiveMatchSessions(userId);
    return sessions.length > 0;
};

const endActiveMatchSessions = async (userId) => {
    const pool = getPool();
    await pool.request()
        .input('userId', sql.Int, userId)
        .query(`
            UPDATE MatchSessions
            SET status = 'ended'
            WHERE (user_one = @userId OR user_two = @userId)
              AND status = 'active'
        `);
};

module.exports = {
    createMatchSession,
    getMatchSessionByUsers,
    getActiveMatchSessions,
    isUserInActiveMatch,
    endActiveMatchSessions
};
