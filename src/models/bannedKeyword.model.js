const { getPool } = require('../config/db');

const getAllBannedKeywords = async () => {
    const pool = getPool();
    try {
        const result = await pool.query('SELECT keyword FROM banned_keywords');
        return result.rows.map(row => row.keyword);
    } catch (error) {
        console.error('getAllBannedKeywords error:', error.message);
        throw error;
    }
};

module.exports = { getAllBannedKeywords };

