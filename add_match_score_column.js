/**
 * Add match_score column to match_sessions table
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

async function addMatchScoreColumn() {
  try {
    console.log('🔧 Adding match_score column to match_sessions table...\n');

    // Add column if not exists
    await pool.query(`
      ALTER TABLE match_sessions 
      ADD COLUMN IF NOT EXISTS match_score INTEGER DEFAULT 0;
    `);

    console.log('✅ Column match_score added successfully!\n');

    // Verify
    const result = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'match_sessions' AND column_name = 'match_score';
    `);

    if (result.rows.length > 0) {
      console.log('📋 Column details:');
      console.log('   Name:', result.rows[0].column_name);
      console.log('   Type:', result.rows[0].data_type);
      console.log('   Default:', result.rows[0].column_default);
    }

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

addMatchScoreColumn();
