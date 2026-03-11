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

async function test() {
  try {
    console.log('Đang kết nối tới SoThichDB...');
    let pool = await sql.connect(config);
    console.log('✅ Kết nối thành công!');
    
    const result = await pool.request()
      .query('SELECT @@SERVERNAME as ServerName, DB_NAME() as DatabaseName');
    
    console.log('\n✅ Thông tin kết nối:');
    console.log('   Server:', result.recordset[0].ServerName);
    console.log('   Database:', result.recordset[0].DatabaseName);
    
    // List tables
    const tablesResult = await pool.request()
      .query(`SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME`);
    
    if (tablesResult.recordset.length > 0) {
      console.log('\n📋 Tables trong database:');
      tablesResult.recordset.forEach(table => {
        console.log(`   - ${table.TABLE_NAME}`);
      });
    }
    
    await pool.close();
    console.log('\n✅ Test hoàn tất! Backend có thể kết nối được.');
  } catch (err) {
    console.error('❌ Lỗi:', err.message);
  }
}

test();
