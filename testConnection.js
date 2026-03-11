require('dotenv').config();
const sql = require('mssql');

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  instance: process.env.DB_INSTANCE, // Thêm instance
  options: {
    encrypt: false,
    trustServerCertificate: true,
    instanceName: process.env.DB_INSTANCE // Thêm instanceName
  }
};

console.log('📋 Cấu hình kết nối:');
console.log(JSON.stringify(dbConfig, null, 2));
console.log('\n📡 Đang kiểm tra kết nối...\n');

sql.connect(dbConfig)
  .then(pool => {
    console.log('✅ Kết nối thành công!');
    console.log(`✅ Database: ${dbConfig.database}`);
    console.log(`✅ User: ${dbConfig.user}`);
    
    // Test query
    return pool.request()
      .query('SELECT @@VERSION AS Version, @@SERVERNAME as ServerName');
  })
  .then(result => {
    console.log('\n✅ Thông tin SQL Server:');
    console.log('   Version:', result.recordset[0].Version.substring(0, 50) + '...');
    console.log('   Server Name:', result.recordset[0].ServerName);
    
    sql.close();
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Lỗi kết nối:');
    console.error('   Code:', err.code);
    console.error('   Message:', err.message);
    
    if (err.code === 'ELOGIN') {
      console.error('\n💡 Nguyên nhân có thể:');
      console.error('   - Password của user "sa" sai');
      console.error('   - SQL Server không chạy');
      console.error('   - User "sa" bị vô hiệu hóa');
      console.error('   - Tên instance SQL Server không chính xác');
    }
    
    process.exit(1);
  });
