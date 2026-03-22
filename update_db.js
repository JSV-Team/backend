const { Pool } = require('pg');
require('dotenv').config({ path: 'src/.env' });

const pool = new Pool();
async function main() {
  const client = await pool.connect();
  try {
    await client.query('ALTER TABLE activities DROP CONSTRAINT IF EXISTS chk_activities_status');
    await client.query("ALTER TABLE activities ADD CONSTRAINT chk_activities_status CHECK (status IN ('active', 'deleted', 'profile'))");
    console.log("SUCCESS: Db constraint updated to allow 'profile'");
  } catch (e) {
    console.error(e);
  } finally {
    client.release();
    process.exit(0);
  }
}
main();
