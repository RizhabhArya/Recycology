/**
 * Calculate cosine similarity between two vectors
 * @param {number[]} a - First vector
 * @param {number[]} b - Second vector
 * @returns {number} - Cosine similarity score (0 to 1)
 */
export function cosine(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) {
    throw new Error('Both arguments must be arrays');
  }

  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  if (a.length === 0) {
    return 0;
  }

  // Calculate dot product
  let dot = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
  }

  // Calculate magnitudes
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }

  magA = Math.sqrt(magA);
  magB = Math.sqrt(magB);

  // Avoid division by zero
  if (magA === 0 || magB === 0) {
    return 0;
  }

  return dot / (magA * magB);
}

/**
 * Calculate final score combining similarity and rating
 * @param {number} similarityScore - Cosine similarity (0 to 1)
 * @param {number} userRating - User rating (0 to 5)
 * @returns {number} - Final score
 */
export function calculateFinalScore(similarityScore, userRating = 0) {
  // Normalize rating to 0-1 scale (0-5 -> 0-1)
  const normalizedRating = userRating / 5;

  // Weighted combination: 70% similarity, 30% rating
  return 0.7 * similarityScore + 0.3 * normalizedRating;
}

