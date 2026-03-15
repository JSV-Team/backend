require('dotenv').config();
const { connectDB, getPool } = require('./src/config/db');

async function checkConstraint() {
    try {
        await connectDB();
        const result = await getPool().request().query(`
      SELECT definition 
      FROM sys.check_constraints 
      WHERE name = 'CHK_Conversation_Type'
    `);
        console.log("Allowed types in DB:", result.recordset[0]?.definition);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkConstraint();
