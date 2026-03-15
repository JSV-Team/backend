// Script to drop the blocking UNIQUE constraint on MatchSessions
const { connectDB, getPool } = require('./src/config/db');

async function fixConstraint() {
    await connectDB();
    const pool = getPool();

    try {
        console.log('Dropping UQ_Match constraint...');
        await pool.request().query(`
            ALTER TABLE MatchSessions
            DROP CONSTRAINT UQ_Match;
        `);
        console.log('[OK] Successfully dropped UQ_Match');
    } catch(e) {
        console.error('[FAIL] Could not drop UQ_Match:', e.message);
    }
    
    // Also let's check what constraints exist on MatchSessions
    try {
        const constraints = await pool.request().query(`
            SELECT 
                TC.CONSTRAINT_NAME, 
                TC.CONSTRAINT_TYPE 
            FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS TC
            WHERE TC.TABLE_NAME = 'MatchSessions'
        `);
        console.log('\n=== Existing Constraints on MatchSessions ===');
        console.log(constraints.recordset);
    } catch(e) {
        console.error('[FAIL] Could not list constraints:', e.message);
    }

    process.exit(0);
}

fixConstraint();
