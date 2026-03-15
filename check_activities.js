require('dotenv').config();
const { connectDB } = require('./src/config/db');
const sql = require('mssql');

async function checkActivities() {
    await connectDB();
    const result = await sql.query(`
        SELECT COUNT(*) as cnt FROM Activities WHERE status = 'active'
    `);
    console.log('Active activities:', result.recordset[0].cnt);
    process.exit(0);
}
checkActivities();
