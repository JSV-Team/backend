const { insertPost } = require('./src/models/post.model');
const { connectDB } = require('./src/config/db');

async function test() {
    try {
        console.log('Connecting to DB...');
        await connectDB();

        const userId = 2;
        const content = 'Test Relative Path Final';
        const imageUrl = '/uploads/1772623138070.png';
        const additionalData = {
            description: 'Test desc',
            location: 'Test loc',
            maxParticipants: 5,
            duration: 30
        };

        console.log('Testing insertPost with:', { userId, content, imageUrl });
        const id = await insertPost(userId, content, imageUrl, additionalData);
        console.log('Success! Created post ID:', id);

        process.exit(0);
    } catch (err) {
        console.error('Test failed:', err);
        process.exit(1);
    }
}

test();
