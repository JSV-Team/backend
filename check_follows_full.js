const { connectDB, getPool } = require('./src/config/db');
(async () => {
    try {
        await connectDB();
        const pool = getPool();
        const result = await pool.request().query("SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Follows'");
        console.log(JSON.stringify(result.recordset, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
