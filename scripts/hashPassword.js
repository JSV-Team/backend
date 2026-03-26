const bcrypt = require('bcrypt');

// Hash password "111111"
const password = '111111';
const saltRounds = 12;

bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) {
        console.error('Error hashing password:', err);
        return;
    }
    
    console.log('\n=================================');
    console.log('Password:', password);
    console.log('Hash:', hash);
    console.log('=================================\n');
    console.log('SQL Update Command:');
    console.log(`UPDATE users SET password_hash = '${hash}' WHERE username = 'admin_123';`);
    console.log('\n');
});
