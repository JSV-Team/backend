/**
 * Numerology Service - Tính toán điểm thần số học
 * Dựa trên ngày sinh (dob) để tính Life Path Number
 */

/**
 * Tính Life Path Number từ ngày sinh
 * Cộng dồn các chữ số của ngày, tháng, năm sinh cho đến khi còn 1 chữ số
 * @param {Date|string} dobDate - Ngày sinh (Date object hoặc string YYYY-MM-DD)
 * @returns {number} - Life Path Number (1-9)
 */
function getLifePathNumber(dobDate) {
  if (!dobDate) {
    console.log('⚠️  No DOB provided, returning default Life Path Number: 5');
    return 5; // Giá trị mặc định nếu không có dob
  }

  // Chuyển đổi sang Date object nếu là string
  const date = typeof dobDate === 'string' ? new Date(dobDate) : dobDate;
  
  // Lấy ngày, tháng, năm
  const day = date.getDate();
  const month = date.getMonth() + 1; // getMonth() trả về 0-11
  const year = date.getFullYear();
  
  console.log(`   📅 DOB: ${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
  
  // Chuyển thành chuỗi và cộng dồn tất cả các chữ số
  const dateString = `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`;
  let sum = 0;
  
  for (const char of dateString) {
    sum += parseInt(char, 10);
  }
  
  console.log(`   🔢 Initial sum: ${sum} (from ${dateString})`);
  
  // Rút gọn đến 1 chữ số
  while (sum > 9) {
    const digits = sum.toString().split('');
    sum = digits.reduce((acc, digit) => acc + parseInt(digit, 10), 0);
    console.log(`   🔄 Reducing: ${sum}`);
  }
  
  console.log(`   ✨ Life Path Number: ${sum}`);
  return sum;
}

/**
 * Tính điểm thần số học giữa 2 Life Path Number
 * @param {number} numA - Life Path Number của user A
 * @param {number} numB - Life Path Number của user B
 * @returns {number} - Điểm thần số học (15 hoặc 30)
 */
function calculateNumerologyScore(numA, numB) {
  console.log(`   🔮 Calculating numerology score: ${numA} vs ${numB}`);
  
  // Kiểm tra cùng nhóm chẵn (2,4,6,8) hoặc cùng lẻ (1,3,5,7,9)
  const isAEven = numA % 2 === 0;
  const isBEven = numB % 2 === 0;
  
  if (isAEven === isBEven) {
    // Cùng nhóm (cả hai chẵn hoặc cả hai lẻ)
    console.log(`   ✅ Same parity (both ${isAEven ? 'even' : 'odd'}): 30 points`);
    return 30;
  } else {
    // Khác nhóm
    console.log(`   ⚡ Different parity: 15 points`);
    return 15;
  }
}

module.exports = {
  getLifePathNumber,
  calculateNumerologyScore
};
