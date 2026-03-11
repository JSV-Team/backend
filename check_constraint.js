const { connectDB, getPool, sql } = require("./src/config/db");

async function checkConstraint() {
    try {
        await connectDB();
        const pool = await getPool();
        const r = await pool.request().query(`
            SELECT OBJECT_DEFINITION(OBJECT_ID('CHK_Activities_Status')) AS CheckConstraint
        `);
        console.log(r.recordset[0].CheckConstraint);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkConstraint();
