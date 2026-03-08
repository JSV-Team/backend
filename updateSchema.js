const sql = require("mssql");
const { dbConfig } = require("./src/config/env");

async function updateSchema() {
  try {
    const pool = await sql.connect(dbConfig);
    console.log("Updating schema...");

    // Check if columns exist first
    const checkColumns = await pool.request().query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Users' AND COLUMN_NAME IN ('gender', 'dob')
    `);

    const existingColumns = checkColumns.recordset.map(r => r.COLUMN_NAME.toLowerCase());

    if (!existingColumns.includes('gender')) {
      console.log("Adding 'gender' column...");
      await pool.request().query("ALTER TABLE Users ADD gender NVARCHAR(10)");
    }

    if (!existingColumns.includes('dob')) {
      console.log("Adding 'dob' column...");
      await pool.request().query("ALTER TABLE Users ADD dob DATE");
    }

    console.log("Schema update completed successfully.");
    await pool.close();
  } catch (err) {
    console.error("Schema update failed:", err);
  }
}

updateSchema();
