const sql = require("mssql");
require("dotenv").config();

// Teste 1: Conexão com named instance
console.log("═══════════════════════════════════════");
console.log("TESTE 1: Conexão com Named Instance");
console.log("═══════════════════════════════════════");

const dbConfig1 = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
    instanceName: process.env.DB_INSTANCE,
    encrypt: false,
    trustServerCertificate: true
  }
};

// Teste 2: Conexão com localhost
console.log("\n═══════════════════════════════════════");
console.log("TESTE 2: Conexão com localhost:1433");
console.log("═══════════════════════════════════════");

const dbConfig2 = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: "localhost",
  port: 1433,
  database: process.env.DB_NAME,
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

// Teste 3: Conexão com 127.0.0.1
console.log("\n═══════════════════════════════════════");
console.log("TESTE 3: Conexão com 127.0.0.1:1433");
console.log("═══════════════════════════════════════");

const dbConfig3 = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: "127.0.0.1",
  port: 1433,
  database: process.env.DB_NAME,
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

const testConnection = async (config, testName) => {
  try {
    console.log(`\n⏳ Tentando ${testName}...`);
    console.log(`   Server: ${config.server}`);
    if (config.port) console.log(`   Port: ${config.port}`);
    if (config.options.instanceName) console.log(`   Instance: ${config.options.instanceName}`);
    console.log(`   Database: ${config.database}`);
    
    const pool = await sql.connect(config);
    console.log(`✅ ${testName} - SUCESSO!`);
    
    const result = await pool.request().query("SELECT @@VERSION as version");
    console.log("✅ Query executada com sucesso");
    console.log(`   SQL Server Version: ${result.recordset[0].version}`);
    
    await pool.close();
    return true;
  } catch (err) {
    console.error(`❌ ${testName} - FALHO`);
    console.error(`   Erro: ${err.code} - ${err.message}`);
    return false;
  }
};

const runTests = async () => {
  const test1 = await testConnection(dbConfig1, "Conexão com Named Instance");
  const test2 = await testConnection(dbConfig2, "Conexão com localhost:1433");
  const test3 = await testConnection(dbConfig3, "Conexão com 127.0.0.1:1433");
  
  console.log("\n═══════════════════════════════════════");
  console.log("RESUMO DOS TESTES");
  console.log("═══════════════════════════════════════");
  console.log(`Named Instance: ${test1 ? "✅ OK" : "❌ FALHO"}`);
  console.log(`localhost:1433: ${test2 ? "✅ OK" : "❌ FALHO"}`);
  console.log(`127.0.0.1:1433: ${test3 ? "✅ OK" : "❌ FALHO"}`);
  
  if (test1 || test2 || test3) {
    console.log("\n✅ Pelo menos uma conexão funcionou!");
  } else {
    console.log("\n❌ Nenhuma conexão funcionou. Possíveis causas:");
    console.log("   1. SQL Server não está escutando em TCP/IP");
    console.log("   2. SQL Browser não está em execução");
    console.log("   3. Firewall bloqueando porta 1433");
    console.log("   4. Senha ou credenciais incorretas");
  }
  
  process.exit(test1 || test2 || test3 ? 0 : 1);
};

runTests();
