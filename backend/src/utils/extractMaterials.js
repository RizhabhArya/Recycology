/**
 * Extracts and normalizes materials from user input text
 * @param {string} text - User input text
 * @returns {string[]} - Array of normalized material keywords
 */
export function extractMaterials(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  // Material synonyms mapping
  const synonyms = {
    'denim jeans': 'denim',
    'jeans': 'denim',
    'denim pants': 'denim',
    'plastic bottle': 'plastic',
    'bottles': 'plastic',
    'glass jar': 'glass',
    'jars': 'glass',
    'mason jar': 'glass',
    'cardboard box': 'cardboard',
    'boxes': 'cardboard',
    'wooden pallet': 'wood',
    'pallets': 'wood',
    'wood': 'wood',
    'fabric': 'fabric',
    'cloth': 'fabric',
    'textile': 'fabric',
    'newspaper': 'paper',
    'magazine': 'paper',
    'paper': 'paper',
    'tin can': 'metal',
    'can': 'metal',
    'aluminum': 'metal',
    'wire': 'metal',
    'rope': 'twine',
    'string': 'twine',
    'yarn': 'twine',
  };

  // Split by common delimiters
  const tokens = text
    .toLowerCase()
    .split(/[,\s]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  // Remove common stop words
  const stopWords = new Set([
    'and',
    'or',
    'the',
    'a',
    'an',
    'with',
    'from',
    'for',
    'i',
    'have',
    'some',
    'old',
    'used',
  ]);

  const normalized = new Set();

  for (const token of tokens) {
    // Skip stop words
    if (stopWords.has(token)) continue;

    // Remove plurals (simple approach)
    let singular = token;
    if (token.endsWith('ies')) {
      singular = token.slice(0, -3) + 'y';
    } else if (token.endsWith('es')) {
      singular = token.slice(0, -2);
    } else if (token.endsWith('s') && token.length > 3) {
      singular = token.slice(0, -1);
    }

    // Check synonyms
    const synonym = synonyms[token] || synonyms[singular] || singular;
    normalized.add(synonym);
  }

  return Array.from(normalized);
}

