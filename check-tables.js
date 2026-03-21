const { connectDB, getPool } = require("./src/config/db");
const sql = require('mssql');
require('dotenv').config();

async function checkTables() {
    try {
        await connectDB();
        const pool = getPool();
        const res = await pool.request().query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_type = 'BASE TABLE'
        `);
        res.recordset.forEach(r => console.log(r.table_name || r.TABLE_NAME));
        await sql.close();
    } catch (err) {
        console.error(err);
    }
}
checkTables();
