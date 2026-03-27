/**
 * Calculate the distance between two points in kilometers using the Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;

  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

/**
 * Calculate a distance score from 0 to 100
 * Closer is better.
 * @param {number} distanceKm - Distance in kilometers
 * @param {number} maxDistance - Maximum distance threshold (default 100km)
 * @returns {number} Score from 0 to 100
 */
function calculateDistanceScore(distanceKm, maxDistance = 100) {
  if (distanceKm === Infinity) return 0;
  if (distanceKm <= 2) return 100; // Very close
  if (distanceKm >= maxDistance) return 0;
  
  // Linear decay for simplicity, or we can use exponential
  return Math.max(0, Math.round(100 * (1 - distanceKm / maxDistance)));
}

/**
 * Calculate a distance score with fallback to location string comparison
 * @param {number} distanceKm - Distance in km
 * @param {string} loc1 - Location string 1
 * @param {string} loc2 - Location string 2
 * @returns {number} Score from 0 to 100
 */
function calculateDistanceScoreWithFallback(distanceKm, loc1, loc2) {
  // If we have a valid distance, use it
  if (distanceKm !== Infinity && distanceKm !== null) {
    return calculateDistanceScore(distanceKm);
  }

  // Fallback to location string matching
  if (!loc1 || !loc2) return 0;

  const normalize = (str) => 
    str.toLowerCase()
       .normalize('NFD')
       .replace(/[\u0300-\u036f]/g, '') // remove diacritics
       .trim();

  if (normalize(loc1) === normalize(loc2)) {
    return 80; // Default score for same location if coordinates missing
  }

  // If one contains the other (e.g., "Hồ Chí Minh" and "TP. Hồ Chí Minh")
  if (normalize(loc1).includes(normalize(loc2)) || normalize(loc2).includes(normalize(loc1))) {
    return 60;
  }

  return 0;
}

module.exports = {
  calculateDistance,
  calculateDistanceScore,
  calculateDistanceScoreWithFallback
};
