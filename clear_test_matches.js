const { getPool } = require('./src/config/db');

(async () => {
  try {
    const pool = getPool();
    
    console.log('🗑️  Clearing test matches...');
    
    // Xóa matches giữa user 18 và 21
    const result = await pool.query(`
      DELETE FROM match_sessions 
      WHERE (user_one = 18 AND user_two = 21) 
         OR (user_one = 21 AND user_two = 18)
      RETURNING *
    `);
    
    console.log(`✅ Deleted ${result.rowCount} match(es)`);
    if (result.rows.length > 0) {
      console.log('Deleted matches:', result.rows);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
})();
