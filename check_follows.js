const { connectDB, getPool } = require('./src/config/db');
(async () => {
    try {
        await connectDB();
        const pool = getPool();
        const r = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Follows'");
        console.log(r.recordset.map(c => c.COLUMN_NAME).join(', '));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
