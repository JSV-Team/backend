const sql = require('mssql');

const config = {
  user: 'sa',
  password: '123456',
  server: '127.0.0.1',
  port: 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function checkDatabases() {
  try {
    let pool = await sql.connect(config);
    
    // List all databases
    const result = await pool.request()
      .query(`SELECT name FROM master..sysdatabases ORDER BY name`);
    
    console.log('📊 Danh sách tất cả databases trên SQL Server:\n');
    result.recordset.forEach(db => {
      console.log(`  - ${db.name}`);
    });
    
    // Check if RecycleDB exists
    console.log('\n🔍 Tìm RecycleDB...');
    const recycleCheck = result.recordset.find(db => db.name === 'RecycleDB');
    
    if (recycleCheck) {
      console.log('✅ RecycleDB tồn tại!');
      
      // Try to access it
      try {
        await pool.close();
        const poolRecycle = await sql.connect({...config, database: 'RecycleDB'});
        console.log('✅ Có thể kết nối tới RecycleDB!');
        
        // List tables
        const tablesResult = await poolRecycle.request()
          .query(`SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE'`);
        
        console.log('\n📋 Tables trong RecycleDB:');
        if (tablesResult.recordset.length > 0) {
          tablesResult.recordset.forEach(table => {
            console.log(`  - ${table.TABLE_NAME}`);
          });
        } else {
          console.log('  (Không có bảng)');
        }
        
        await poolRecycle.close();
      } catch(err) {
        console.log('❌ Không thể kết nối tới RecycleDB:', err.message);
      }
    } else {
      console.log('❌ RecycleDB KHÔNG tồn tại!');
      console.log('\n💡 Cần tạo database hoặc thay đổi tên trong .env');
    }
    
    await pool.close();
  } catch (err) {
    console.error('❌ Lỗi:', err.message);
  }
}

checkDatabases();
