const sql = require("mssql");
const { dbConfig } = require("./src/config/env");

async function runMigration() {
    try {
        const pool = await sql.connect(dbConfig);
        console.log("Connected to DB, running migration...");

        await pool.request().query(`
      IF OBJECT_ID('DF_Activities_Status', 'D') IS NOT NULL
          ALTER TABLE Activities DROP CONSTRAINT DF_Activities_Status;
          
      IF OBJECT_ID('CHK_Activities_Status', 'C') IS NOT NULL
          ALTER TABLE Activities DROP CONSTRAINT CHK_Activities_Status;

      ALTER TABLE Activities ADD CONSTRAINT DF_Activities_Status DEFAULT 'active' FOR status;
      UPDATE Activities SET status = 'active' WHERE status IN ('pending', 'approved');
      UPDATE Activities SET status = 'deleted' WHERE status NOT IN ('active');
      ALTER TABLE Activities ADD CONSTRAINT CHK_Activities_Status CHECK (status IN ('active', 'deleted'));
    `);

        console.log("Migration successful!");
        process.exit(0);
    } catch (error) {
        console.error("Migration failed:", error.message);
        process.exit(1);
    }
}

runMigration();
