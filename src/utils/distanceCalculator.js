/**
 * Distance Calculator Utility
 * Tính khoảng cách giữa 2 điểm trên Trái Đất sử dụng công thức Haversine
 */

/**
 * Tính khoảng cách giữa 2 tọa độ (latitude, longitude) theo công thức Haversine
 * @param {number} lat1 - Vĩ độ điểm 1 (degrees)
 * @param {number} lon1 - Kinh độ điểm 1 (degrees)
 * @param {number} lat2 - Vĩ độ điểm 2 (degrees)
 * @param {number} lon2 - Kinh độ điểm 2 (degrees)
 * @returns {number} - Khoảng cách tính bằng km
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  // Kiểm tra input hợp lệ
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
    return null;
  }

  const R = 6371; // Bán kính Trái Đất (km)
  
  // Chuyển đổi độ sang radian
  const toRad = (deg) => (deg * Math.PI) / 180;
  
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  const distance = R * c; // Khoảng cách tính bằng km
  
  return Math.round(distance * 100) / 100; // Làm tròn 2 chữ số thập phân
}

/**
 * Kiểm tra xem 2 điểm có nằm trong bán kính cho trước không
 * @param {number} lat1 - Vĩ độ điểm 1
 * @param {number} lon1 - Kinh độ điểm 1
 * @param {number} lat2 - Vĩ độ điểm 2
 * @param {number} lon2 - Kinh độ điểm 2
 * @param {number} radiusKm - Bán kính tính bằng km
 * @returns {boolean} - true nếu trong bán kính, false nếu ngoài
 */
function isWithinRadius(lat1, lon1, lat2, lon2, radiusKm) {
  const distance = calculateDistance(lat1, lon1, lat2, lon2);
  
  if (distance === null) {
    return false;
  }
  
  return distance <= radiusKm;
}

module.exports = {
  calculateDistance,
  isWithinRadius
};
