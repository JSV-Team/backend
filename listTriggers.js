const sql = require("mssql");
const { dbConfig } = require("./src/config/env");

async function listTriggers() {
  try {
    const pool = await sql.connect(dbConfig);
    console.log("Listing all triggers on Users table...");

    const r = await pool.request().query(`
      SELECT 
          t.name AS TriggerName,
          parent.name AS TableName,
          m.definition
      FROM sys.triggers t
      JOIN sys.objects parent ON t.parent_id = parent.object_id
      JOIN sys.sql_modules m ON t.object_id = m.object_id
      WHERE parent.name = 'Users'
    `);

    console.log("--- Results ---");
    console.log(JSON.stringify(r.recordset, null, 2));

    await pool.close();
  } catch (err) {
    console.error(err);
  }
}

listTriggers();
