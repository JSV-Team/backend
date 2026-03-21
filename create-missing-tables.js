const { connectDB, getPool } = require("./src/config/db");
const sql = require('mssql');
require('dotenv').config();

async function createMissingTables() {
    try {
        await connectDB();
        const pool = getPool();
        
        console.log("Creating PostReactions...");
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PostReactions')
            CREATE TABLE PostReactions (
                reaction_id INT IDENTITY(1,1) PRIMARY KEY,
                post_id INT NOT NULL,
                user_id INT NOT NULL,
                emoji NVARCHAR(20) NOT NULL,
                created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
                updated_at DATETIME2 NULL,
                CONSTRAINT FK_PostReactions_User FOREIGN KEY (user_id) REFERENCES Users(user_id)
            )
        `);

        console.log("Creating PostComments...");
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PostComments')
            CREATE TABLE PostComments (
                comment_id INT IDENTITY(1,1) PRIMARY KEY,
                post_id INT NOT NULL,
                user_id INT NOT NULL,
                content NVARCHAR(1000) NOT NULL,
                created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
                CONSTRAINT FK_PostComments_User FOREIGN KEY (user_id) REFERENCES Users(user_id)
            )
        `);

        console.log("Creating PostShares...");
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PostShares')
            CREATE TABLE PostShares (
                share_id INT IDENTITY(1,1) PRIMARY KEY,
                post_id INT NOT NULL,
                user_id INT NOT NULL,
                created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
                CONSTRAINT FK_PostShares_User FOREIGN KEY (user_id) REFERENCES Users(user_id)
            )
        `);

        console.log("Tables created successfully.");
        await sql.close();
    } catch (err) {
        console.error("Error creating tables:", err.message);
    }
}
createMissingTables();
