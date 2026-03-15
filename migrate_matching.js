// Migration script: Add matching columns and MatchSessions table
const { connectDB, getPool } = require('./src/config/db');
const sql = require('mssql');

async function runMigration() {
    await connectDB();
    const pool = getPool();

    console.log('Running matching feature migration...');

    // 1. Add is_matching_enabled column to Users
    try {
        await pool.request().query(`
            IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'is_matching_enabled')
            BEGIN
                ALTER TABLE Users ADD is_matching_enabled BIT DEFAULT 0;
            END
        `);
        console.log('[OK] is_matching_enabled column');
    } catch(e) {
        console.error('[FAIL] is_matching_enabled:', e.message);
    }

    // 2. Add last_matched_at column to Users
    try {
        await pool.request().query(`
            IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'last_matched_at')
            BEGIN
                ALTER TABLE Users ADD last_matched_at DATETIME NULL;
            END
        `);
        console.log('[OK] last_matched_at column');
    } catch(e) {
        console.error('[FAIL] last_matched_at:', e.message);
    }

    // 3. Add is_auto_created column to Conversations
    try {
        await pool.request().query(`
            IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Conversations') AND name = 'is_auto_created')
            BEGIN
                ALTER TABLE Conversations ADD is_auto_created BIT DEFAULT 0;
            END
        `);
        console.log('[OK] is_auto_created column on Conversations');
    } catch(e) {
        console.error('[FAIL] is_auto_created:', e.message);
    }

    // 4. Create MatchSessions table
    try {
        await pool.request().query(`
            IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'MatchSessions')
            BEGIN
                CREATE TABLE MatchSessions (
                    session_id INT IDENTITY(1,1) PRIMARY KEY,
                    user_id_1 INT NOT NULL,
                    user_id_2 INT NOT NULL,
                    status NVARCHAR(20) DEFAULT 'active',
                    created_at DATETIME DEFAULT SYSDATETIME(),
                    FOREIGN KEY (user_id_1) REFERENCES Users(user_id),
                    FOREIGN KEY (user_id_2) REFERENCES Users(user_id)
                );
            END
        `);
        console.log('[OK] MatchSessions table');
    } catch(e) {
        console.error('[FAIL] MatchSessions:', e.message);
    }

    console.log('\nMigration complete!');
    process.exit(0);
}

runMigration();
