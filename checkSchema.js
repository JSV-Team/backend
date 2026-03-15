const sql = require('mssql');
const { dbConfig } = require('./src/config/env');

async function test() {
  try {
    console.log('Connecting to DB...');
    const pool = await sql.connect(dbConfig);
    
    console.log('--- Object Type ---');
    const res1 = await pool.request().query("SELECT name, type_desc FROM sys.objects WHERE name = 'Users'");
    console.log(res1.recordset);

    console.log('--- Columns in Users ---');
    const res2 = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Users'");
    console.log(res2.recordset.map(r => r.COLUMN_NAME));

    if (res1.recordset[0]?.type_desc === 'VIEW') {
        console.log('--- View Definition ---');
        const res3 = await pool.request().query("SELECT OBJECT_DEFINITION(OBJECT_ID('Users')) as def");
        console.log(res3.recordset[0].def);
    }

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
test();
