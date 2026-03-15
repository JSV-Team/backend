require('dotenv').config();
const { connectDB } = require('./src/config/db');
const sql = require('mssql');

async function checkConstraint() {
    await connectDB();
    const result = await sql.query(`
        SELECT definition 
        FROM sys.check_constraints 
        WHERE name = 'CHK_Activities_Status'
    `);
    console.log('Constraint definition:', result.recordset[0]?.definition);
    process.exit(0);
}
checkConstraint();
