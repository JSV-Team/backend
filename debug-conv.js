const { getPool } = require('./src/config/db');
const chatModel = require('./src/models/chat.model');

async function debug() {
  const pool = getPool();

  // Kiểm tra activity 4
  console.log('Activity 4 status:');
  const act = await pool.query('SELECT activity_id, status FROM activities WHERE activity_id = 4');
  console.log(act.rows);

  // Kiểm tra conversation
  console.log('\nConversation for activity 4:');
  const conv = await chatModel.getConversationByActivityId(4);
  console.log(conv);

  // Kiểm tra trực tiếp
  console.log('\nDirect query:');
  const direct = await pool.query('SELECT * FROM conversations WHERE activity_id = 4');
  console.log(direct.rows);

  await pool.end();
}

debug();