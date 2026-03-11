const sql = require('mssql');

const config = {
  user: 'sa',
  password: '123456',
  server: '127.0.0.1',
  port: 1433,
  database: 'SoThichDB',
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function checkData() {
  try {
    let pool = await sql.connect(config);
    
    console.log('📊 === DATABASE DEBUG ===\n');
    
    // 1. Check Activities table structure
    console.log('1️⃣ Activities Table Schema:');
    const schemaResult = await pool.request()
      .query(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'Activities' 
        ORDER BY ORDINAL_POSITION
      `);
    
    schemaResult.recordset.forEach(col => {
      console.log(`   ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'} ${col.COLUMN_DEFAULT || ''}`);
    });
    
    // 2. Count all activities
    console.log('\n2️⃣ All Activities Count:');
    const countResult = await pool.request()
      .query(`SELECT COUNT(*) as total FROM Activities`);
    console.log(`   Total: ${countResult.recordset[0].total}`);
    
    // 3. Check Activities by status
    console.log('\n3️⃣ Activities by Status:');
    const statusResult = await pool.request()
      .query(`
        SELECT status, COUNT(*) as count 
        FROM Activities 
        GROUP BY status
      `);
    
    if (statusResult.recordset.length === 0) {
      console.log('   (No status data - all NULL or empty)');
    } else {
      statusResult.recordset.forEach(row => {
        console.log(`   Status "${row.status}": ${row.count}`);
      });
    }
    
    // 4. Get all Activities with data
    console.log('\n4️⃣ All Activities Data:');
    const allResult = await pool.request()
      .query(`
        SELECT 
          activity_id, 
          creator_id, 
          title, 
          status, 
          created_at 
        FROM Activities 
        ORDER BY created_at DESC
      `);
    
    if (allResult.recordset.length === 0) {
      console.log('   ❌ No activities found in database!');
    } else {
      allResult.recordset.forEach(activity => {
        console.log(`   - ID: ${activity.activity_id}, Creator: ${activity.creator_id}, Title: "${activity.title}", Status: "${activity.status}", Created: ${activity.created_at}`);
      });
    }
    
    // 5. Check what getApprovedActivities returns
    console.log('\n5️⃣ Approved Activities (what frontend gets):');
    const approvedResult = await pool.request()
      .query(`
        SELECT TOP 50
          a.activity_id AS status_id,
          a.creator_id AS user_id,
          a.title AS content,
          a.created_at,
          a.status
        FROM Activities a
        LEFT JOIN Users u ON a.creator_id = u.user_id
        WHERE a.status IN ('approved', 'active')
        ORDER BY a.created_at DESC
      `);
    
    if (approvedResult.recordset.length === 0) {
      console.log('   ❌ No approved/active activities!');
      console.log('   💡 This is why frontend sees no data!');
    } else {
      approvedResult.recordset.forEach(activity => {
        console.log(`   - ID: ${activity.status_id}, Content: "${activity.content}"`);
      });
    }
    
    // 6. Users check
    console.log('\n6️⃣ Users in Database:');
    const usersResult = await pool.request()
      .query(`SELECT TOP 10 user_id, username, email FROM Users ORDER BY user_id DESC`);
    
    if (usersResult.recordset.length === 0) {
      console.log('   (No users)');
    } else {
      usersResult.recordset.forEach(user => {
        console.log(`   - ID: ${user.user_id}, Username: ${user.username}, Email: ${user.email}`);
      });
    }
    
    await pool.close();
    
    console.log('\n' + '='.repeat(50));
    console.log('💡 ANALYSIS:');
    console.log('='.repeat(50));
    
    if (allResult.recordset.length === 0) {
      console.log('❌ Problem: No activities in database');
      console.log('   Fix: Create a post through the frontend/API');
    } else if (approvedResult.recordset.length === 0) {
      console.log('❌ Problem: Activities exist but status is not "approved" or "active"');
      console.log('   Default status should be set when creating activity');
      console.log('   Current statuses: ' + [...new Set(allResult.recordset.map(a => a.status))].join(', '));
    } else {
      console.log('✅ Everything looks good!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkData();
