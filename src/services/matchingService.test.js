/**
 * TEST FILE - Demo cách sử dụng matchingService
 * 
 * Chạy test này để xem cách hoạt động của Phễu 3 Tầng:
 * node backend/src/services/matchingService.test.js
 */

const matchingService = require('./matchingService');

async function testMatching() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  TEST: MATCHING SERVICE - PHỄU 3 TẦNG                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  try {
    // Test 1: Tìm người phù hợp nhất cho User 2 (Nguyễn Văn Minh)
    console.log('TEST 1: Tìm người phù hợp nhất cho User 2 (Nguyễn Văn Minh - Hà Nội)');
    console.log('═══════════════════════════════════════════════════════════════════\n');
    
    const bestMatch = await matchingService.findBestMatchForUser(2);
    
    if (bestMatch) {
      console.log('\n✅ KẾT QUẢ:');
      console.log('─────────────────────────────────────────────────────────────');
      console.log(`👤 Người phù hợp nhất: ${bestMatch.candidateInfo.fullName} (@${bestMatch.candidateInfo.username})`);
      console.log(`📍 Vị trí: ${bestMatch.candidateInfo.location}`);
      console.log(`\n📊 ĐIỂM SỐ:`);
      console.log(`   🎯 Tổng điểm: ${bestMatch.totalScore}/100`);
      console.log(`   💝 Điểm sở thích: ${bestMatch.interestScore}/70`);
      console.log(`   🔮 Điểm thần số học: ${bestMatch.numerologyScore}/30`);
      console.log(`\n🎨 Sở thích chung (${bestMatch.commonInterests.length}):`);
      bestMatch.commonInterests.forEach(interest => {
        console.log(`   - ${interest.name}`);
      });
      console.log(`\n🔢 Life Path Numbers:`);
      console.log(`   - User 2: ${bestMatch.lifePathNum1}`);
      console.log(`   - ${bestMatch.candidateInfo.username}: ${bestMatch.lifePathNum2}`);
      console.log('─────────────────────────────────────────────────────────────\n');
    } else {
      console.log('\n❌ Không tìm thấy người phù hợp\n');
    }
    
    // Test 2: Tính điểm trực tiếp giữa 2 user
    console.log('\n\nTEST 2: Tính điểm trực tiếp giữa User 2 và User 7');
    console.log('═══════════════════════════════════════════════════════════════════\n');
    
    const directScore = await matchingService.calculateTotalMatchScore(
      2, 7,
      '1995-03-22', // DOB của User 2
      '1994-12-01'  // DOB của User 7
    );
    
    console.log('\n✅ KẾT QUẢ:');
    console.log('─────────────────────────────────────────────────────────────');
    console.log(`🎯 Tổng điểm: ${directScore.totalScore}/100`);
    console.log(`💝 Điểm sở thích: ${directScore.interestScore}/70 (raw: ${directScore.breakdown.interest.rawScore}%)`);
    console.log(`🔮 Điểm thần số học: ${directScore.numerologyScore}/30`);
    console.log(`🔢 Life Path Numbers: ${directScore.lifePathNum1} vs ${directScore.lifePathNum2}`);
    console.log(`🎨 Sở thích chung: ${directScore.commonInterests.length}`);
    console.log('─────────────────────────────────────────────────────────────\n');
    
  } catch (error) {
    console.error('❌ LỖI:', error.message);
    console.error(error.stack);
  }
  
  process.exit(0);
}

// Chỉ chạy nếu file này được gọi trực tiếp
if (require.main === module) {
  testMatching();
}

module.exports = { testMatching };
