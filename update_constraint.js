require('dotenv').config();
const { connectDB, getPool } = require('./src/config/db');

async function updateConstraint() {
    try {
        await connectDB();
        const pool = getPool();
        await pool.request().query(`
      IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CHK_Conversation_Type')
      BEGIN
          ALTER TABLE Conversations DROP CONSTRAINT CHK_Conversation_Type;
      END
      ALTER TABLE Conversations ADD CONSTRAINT CHK_Conversation_Type CHECK (conversation_type IN ('direct', 'group', 'activity', 'private'));
    `);
        console.log("✅ Check Constraint CHK_Conversation_Type updated to allow 'private'!");
    } catch (err) {
        console.error("❌ Error updating constraint:", err);
    } finally {
        process.exit();
    }
}

updateConstraint();
