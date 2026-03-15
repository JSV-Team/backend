const { connectDB, getPool } = require('./src/config/db');

async function checkMatch() {
    await connectDB();
    const pool = getPool();
    const result = await pool.request().query(`
        SELECT TOP 1 * FROM MatchSessions ORDER BY created_at DESC
    `);
    console.log(result.recordset);
    process.exit(0);
}
checkMatch();
