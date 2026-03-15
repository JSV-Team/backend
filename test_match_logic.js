require('dotenv').config();
const { connectDB } = require('./src/config/db');
const matchingService = require('./src/services/matching.service');

async function testMatch() {
    await connectDB();
    try {
        console.log('Testing findMatch for user_id = 2...');
        const match = await matchingService.findMatch(2);
        if (!match) {
            console.log('No compatible user found.');
            process.exit(0);
        }
        console.log('Found match:', match);

        console.log('\nCreating match session...');
        const session = await matchingService.createMatchSession(2, match.user_id);
        console.log('Success!', session);
    } catch (error) {
        console.error('Error occurred:', error.message);
    }
    process.exit(0);
}

testMatch();
