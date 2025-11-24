import { pipeline } from '@xenova/transformers';

let embeddingModel = null;

/**
 * Initialize the embedding model (lazy loading)
 * @returns {Promise} - The embedding model
 */
async function getEmbeddingModel() {
  if (!embeddingModel) {
    // Using all-MiniLM-L6-v2 (384 dimensions, fast and efficient)
    embeddingModel = await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2'
    );
  }
  return embeddingModel;
}

/**
 * Generate embedding vector for text
 * @param {string} text - Input text to embed
 * @returns {Promise<number[]>} - 384-dimensional embedding vector
 */
export async function getEmbedding(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('Text must be a non-empty string');
  }

  try {
    const model = await getEmbeddingModel();
    const output = await model(text, {
      pooling: 'mean',
      normalize: true,
    });

    // Convert tensor to array
    const embedding = Array.from(output.data);
    return embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
}

/**
 * Generate embedding for materials array
 * @param {string[]} materials - Array of material keywords
 * @returns {Promise<number[]>} - 384-dimensional embedding vector
 */
export async function getMaterialsEmbedding(materials) {
  if (!Array.isArray(materials) || materials.length === 0) {
    throw new Error('Materials must be a non-empty array');
  }

  // Join materials into a single string
  const materialsText = materials.join(' ');
  return getEmbedding(materialsText);
}

