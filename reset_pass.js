const sql = require('mssql');
const bcrypt = require('bcrypt');
const { dbConfig } = require('./src/config/env');

async function resetPassword() {
    try {
        await sql.connect(dbConfig);
        console.log('Connected to database');

        const password = 'Password123!';
        const saltRounds = 10;
        const hash = await bcrypt.hash(password, saltRounds);

        const request = new sql.Request();
        request.input('hash', sql.NVarChar, hash);
        
        const result = await request.query(`
            UPDATE Users 
            SET password_hash = @hash, is_locked = 0, status = 'active'
            WHERE username IN ('admin', 'minhkhoa98')
        `);

        console.log('Rows affected:', result.rowsAffected);
        console.log('New hash (for reference):', hash);
        
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

resetPassword();
