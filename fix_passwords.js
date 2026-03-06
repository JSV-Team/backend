const sql = require('mssql');
const bcrypt = require('bcrypt');
const { connectDB, getPool } = require('./src/config/db');

async function fix() {
    await connectDB();
    const pool = getPool();
    // Valid hash for Password123!
    const hash = await bcrypt.hash('Password123!', 10);
    console.log('New hash:', hash);
    const result = await pool.request().query(`UPDATE Users SET password_hash = '${hash}'`);
    console.log(`Updated ${result.rowsAffected} users with the correct password hash.`);
    process.exit(0);
}
fix().catch(err => {
    console.error(err);
    process.exit(1);
});
