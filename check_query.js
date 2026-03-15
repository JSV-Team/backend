require('dotenv').config();
const { connectDB, getPool } = require('./src/config/db');

async function testQuery() {
    await connectDB();
    const pool = getPool();
    const result = await pool.request().query(`
    SELECT is_matching_enabled from Users where user_id = 2
    `);
    console.log('Query result count:', result.recordset.length);
    console.log('Sample record:', result.recordset[0]);
    process.exit(0);
}
testQuery();
