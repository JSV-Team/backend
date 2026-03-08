require('dotenv').config();
const { connectDB } = require('./src/config/db');
const { insertPost, getPostById, getAllPosts } = require('./src/models/post.model');

async function runTest() {
    try {
        await connectDB();
        console.log("Creating a test post...");

        // We assume user_id 1 exists. If not, it will throw a foreign key error on Activities.creator_id
        // But this is just test data.
        const postId = await insertPost(1, "Test API functionality", "http://example.com/test.jpg", {
            description: "Testing after fixing bug",
            location: "Local Database",
            maxParticipants: 5,
            duration: 30
        });
        console.log("✅ Post created successfully with ID:", postId);

        console.log("Fetching the post...");
        const post = await getPostById(postId);
        console.log("✅ Fetched post object:", JSON.stringify(post, null, 2));

        console.log("Fetching all posts...");
        const posts = await getAllPosts(1);
        console.log(`✅ Fetched ${posts.length} posts.`);

        console.log("🎉 All tests passed!");
    } catch (err) {
        console.error("❌ Test failed:", err);
    } finally {
        process.exit(0);
    }
}

runTest();
