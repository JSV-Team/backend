const jwt = require('jsonwebtoken');
const fs = require('fs');

const secret = 'ef57bd01265096f3a2dd4f77df16c47c3e948a93da154e81837ad5ee002894f77fba25223458f10ee5cffc2b41f99d90751a97aa274d227746651d38767274b8';

const userToken = jwt.sign({ user_id: 2, role: 'user' }, secret, { expiresIn: '1h' });
const adminToken = jwt.sign({ user_id: 1, role: 'admin' }, secret, { expiresIn: '1h' });

const output = `USER_TOKEN=${userToken}\nADMIN_TOKEN=${adminToken}`;
fs.writeFileSync('tokens.txt', output);
console.log('Tokens written to tokens.txt');
