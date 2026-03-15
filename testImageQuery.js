const { getPool } = require('./src/config/db');

const testQuery = async () => {
  try {
    // Setup pool
    const pool = getPool();
    
    // Test query mới (with COALESCE)
    console.log('Testing COALESCE query...\n');
    const result = await pool.request().query(`
      SELECT TOP 5
        a.activity_id,
        a.title,
        a.image_url AS image_from_activities,
        (SELECT TOP 1 ai.image_url FROM ActivityImages ai WHERE ai.activity_id = a.activity_id) AS image_from_activityimages,
        COALESCE(
          (SELECT TOP 1 ai.image_url FROM ActivityImages ai WHERE ai.activity_id = a.activity_id),
          a.image_url
        ) AS final_image_url
      FROM Activities a
      WHERE a.image_url IS NOT NULL OR 
            (SELECT COUNT(*) FROM ActivityImages ai WHERE ai.activity_id = a.activity_id) > 0
      ORDER BY a.created_at DESC
    `);

    console.log('Activities with images:');
    result.recordset.forEach((row, i) => {
      console.log(`\n${i + 1}. Activity ID: ${row.activity_id}, Title: ${row.title}`);
      console.log(`   From Activities table: ${row.image_from_activities}`);
      console.log(`   From ActivityImages table: ${row.image_from_activityimages}`);
      console.log(`   Final (COALESCE): ${row.final_image_url}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

testQuery();
