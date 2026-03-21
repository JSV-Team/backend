const axios = require('axios');
const { getPool } = require('./src/config/db');

async function testDeleteActivityWithConversation() {
  const pool = getPool();

  console.log('=== Test: Xóa activity 4 và conversation theo ===');

  // Kiểm tra activity 4 có conversation chưa
  console.log('\n1. Kiểm tra conversation của activity 4...');
  let convResult = await pool.query(
    'SELECT conversation_id FROM conversations WHERE activity_id = $1',
    [4]
  );

  if (!convResult.rows.length) {
    // Tạo conversation nếu chưa có
    await pool.query(
      `INSERT INTO conversations (conversation_type, activity_id, created_at)
       VALUES ('activity', 4, NOW()) RETURNING conversation_id`
    );
    convResult = await pool.query(
      'SELECT conversation_id FROM conversations WHERE activity_id = $1',
      [4]
    );
  }
  const convId = convResult.rows[0].conversation_id;
  console.log('✓ Conversation ID:', convId);

  // Thêm messages
  await pool.query(
    `INSERT INTO messages (conversation_id, sender_id, content, msg_type, created_at)
     VALUES ($1, 2, 'Test message A', 'text', NOW()),
     ($1, 7, 'Test message B', 'text', NOW())`,
    [convId]
  );
  console.log('✓ Đã thêm messages');

  // Kiểm tra messages trước
  const msgBefore = await pool.query('SELECT COUNT(*) FROM messages WHERE conversation_id = $1', [convId]);
  console.log('✓ Messages trước xóa:', msgBefore.rows[0].count);

  // Kiểm tra activity 4 creator
  const actResult = await pool.query('SELECT creator_id, title FROM activities WHERE activity_id = $1', [4]);
  console.log('✓ Activity 4 creator:', actResult.rows[0]);

  // Xóa activity 4 (creator_id = 7)
  console.log('\n2. Xóa activity 4...');
  try {
    const res = await axios.delete('http://localhost:3001/api/activities/4', {
      data: { userId: 7 }
    });
    console.log('Response:', res.data);
  } catch (err) {
    console.log('Error:', err.response?.data || err.message);
  }

  // Kiểm tra sau khi xóa
  console.log('\n3. Kiểm tra sau khi xóa:');
  const convAfter = await pool.query('SELECT * FROM conversations WHERE conversation_id = $1', [convId]);
  console.log('  - Conversation còn không:', convAfter.rows.length > 0 ? 'Còn' : 'Đã xóa');

  const msgAfter = await pool.query('SELECT COUNT(*) FROM messages WHERE conversation_id = $1', [convId]);
  console.log('  - Messages còn không:', msgAfter.rows[0].count > 0 ? msgAfter.rows[0].count + ' messages' : 'Đã xóa hết');
}

testDeleteActivityWithConversation();