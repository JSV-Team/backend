const { Pool } = require('pg');
require('dotenv').config({ path: 'src/.env' });

const pool = new Pool();
pool.query(`
  SELECT pg_get_constraintdef(c.oid) AS def
  FROM pg_constraint c
  JOIN pg_namespace n ON n.oid = c.connamespace
  WHERE c.conrelid::regclass::text = 'activities'
`).then(res => {
  console.log("CONSTRAINTS:", res.rows);
  return pool.query(`SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema='public'`);
}).then(res => {
  console.log("TABLES:", res.rows.map(r=>r.table_name));
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});
