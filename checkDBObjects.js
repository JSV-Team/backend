const sql = require("mssql");
const { dbConfig } = require("./src/config/env");

async function checkDatabaseObjects() {
  try {
    const pool = await sql.connect(dbConfig);
    console.log("Searching for 'group_score' or 'dob' in database objects...");

    const r = await pool.request().query(`
      SELECT OBJECT_NAME(m.object_id) AS ObjectName,
             o.type_desc AS ObjectType,
             m.definition
      FROM sys.sql_modules m
      JOIN sys.objects o ON m.object_id = o.object_id
      WHERE m.definition LIKE '%group_score%'
         OR m.definition LIKE '%dob%'
    `);

    console.log("--- Results ---");
    console.log(JSON.stringify(r.recordset, null, 2));

    await pool.close();
  } catch (err) {
    console.error(err);
  }
}

checkDatabaseObjects();
