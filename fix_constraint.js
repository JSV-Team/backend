const { connectDB, getPool, sql } = require("./src/config/db");

async function fixConstraint() {
    try {
        await connectDB();
        const pool = await getPool();
        
        console.log("--- UPDATING CONSTRAINT ---");
        // Drop existing constraint
        await pool.request().query(`
            ALTER TABLE Activities DROP CONSTRAINT CHK_Activities_Status;
        `);
        // Create new constraint
        await pool.request().query(`
            ALTER TABLE Activities ADD CONSTRAINT CHK_Activities_Status 
            CHECK (status IN ('active', 'deleted', 'pending', 'approved', 'rejected'));
        `);
        console.log("Constraint updated successfully.");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

fixConstraint();
