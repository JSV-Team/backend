const { getPool } = require('./src/config/db');
const pool = getPool();

async function restore() {
  await pool.query("UPDATE activities SET status = 'active' WHERE activity_id = 4");
  console.log('✓ Đã khôi phục activity 4');
  await pool.end();
}
restore();