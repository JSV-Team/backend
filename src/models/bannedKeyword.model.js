const { getPool } = require('../config/db');

const getAllBannedKeywords = async () => {
    const pool = getPool();
    try {
        const result = await pool.request().query('SELECT keyword FROM BannedKeywords');
        return result.recordset.map(row => row.keyword);
    } catch (error) {
        console.error('getAllBannedKeywords error:', error.message);
        throw error;
    }
};

module.exports = { getAllBannedKeywords };
