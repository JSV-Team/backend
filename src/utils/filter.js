const { getPool, sql } = require("../config/db");

/**
 * Kiểm tra xem văn bản có chứa từ khóa cấm nào không.
 * @param {string} text Văn bản cần kiểm tra
 * @returns {Promise<string|null>} Trả về từ khóa bị cấm nếu tìm thấy, ngược lại trả về null.
 */
async function checkBannedKeywords(text) {
  if (!text) return null;
  
  const pool = await getPool();
  const result = await pool.request().query("SELECT keyword FROM BannedKeywords");
  const lowerText = text.toLowerCase();

  for (const row of result.recordset) {
    const keyword = row.keyword.trim().toLowerCase();
    if (keyword && lowerText.includes(keyword)) {
      return row.keyword.trim();
    }
  }
  
  return null;
}

module.exports = {
  checkBannedKeywords
};
