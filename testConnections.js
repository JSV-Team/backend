const sql = require('mssql');

const config1 = {
  user: 'sa',
  password: '123456',
  server: '127.0.0.1',
  port: 1433,
  database: 'RecycleDB',
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

const config2 = {
  user: 'sa',
  password: '123456',
  server: '127.0.0.1',
  port: 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function testConnection() {
  console.log('🔍 Test 1: Với database RecycleDB');
  try {
    let pool = await sql.connect(config1);
    console.log('✅ Kết nối thành công!');
    await pool.close();
  } catch (err) {
    console.log('❌ Lỗi:', err.message);
  }

  console.log('\n🔍 Test 2: Kết nối tới master database (không chỉ định DB)');
  try {
    let pool = await sql.connect(config2);
    console.log('✅ Kết nối thành công!');
    
    // Test query
    const result = await pool.request()
      .query('SELECT @@VERSION as Version, DB_NAME() as CurrentDB');
    
    console.log('📊 Server Info:');
    console.log('   Version:', result.recordset[0].Version.substring(0, 60));
    console.log('   Current DB:', result.recordset[0].CurrentDB);
    
    await pool.close();
  } catch (err) {
    console.log('❌ Lỗi:', err.message);
  }

  console.log('\n🔍 Test 3: Test Windows Authentication (integrated security)');
  const config3 = {
    server: '127.0.0.1',
    port: 1433,
    database: 'RecycleDB',
    options: {
      encrypt: false,
      trustedConnection: true,
      trustServerCertificate: true
    }
  };

  try {
    let pool = await sql.connect(config3);
    console.log('✅ Windows Authentication thành công!');
    await pool.close();
  } catch (err) {
    console.log('❌ Lỗi:', err.message);
  }
}

testConnection();
