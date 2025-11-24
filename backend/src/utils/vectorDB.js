// src/utils/vectorDB.js
import { promises as fs } from 'fs';
import { constants } from 'fs';
import { access, mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import faiss from 'faiss-node';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define paths
const DATA_DIR = path.join(__dirname, '../../data');
const INDEX_PATH = path.join(DATA_DIR, 'faiss.index');
const MAPPING_PATH = path.join(DATA_DIR, 'faiss_mapping.json');

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await access(DATA_DIR, constants.F_OK);
  } catch {
    await mkdir(DATA_DIR, { recursive: true });
  }
}

class VectorDB {
  constructor(dimensions = 384) {
    this.dimensions = dimensions;
    this.index = null;
    this.mapping = []; // We'll keep track of ID to index mapping
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      await ensureDataDir();
      
      // Try to load existing index
      try {
        await access(INDEX_PATH, constants.F_OK);
        
        // Load existing index
        this.index = new faiss.IndexFlatL2(this.dimensions);
        await this.index.read(INDEX_PATH);
        
        // Load mapping
        const mappingData = await readFile(MAPPING_PATH, 'utf-8');
        this.mapping = JSON.parse(mappingData);
        
        console.log(`✅ Loaded FAISS index with ${this.mapping.length} vectors`);
      } catch (error) {
        // Create new index
        this.index = new faiss.IndexFlatL2(this.dimensions);
        this.mapping = [];
        console.log('✅ Created new FAISS index');
      }
      
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Error initializing FAISS index:', error);
      throw error;
    }
  }

  async addVectors(vectors, ids) {
    if (!this.isInitialized) await this.initialize();
    
    if (!vectors || !ids || vectors.length === 0 || ids.length === 0) {
      throw new Error('Vectors and IDs must be non-empty arrays');
    }

    if (vectors.length !== ids.length) {
      throw new Error('Vectors and IDs must have the same length');
    }

    try {
      console.log(`Processing ${vectors.length} vectors...`);
      
      // First, validate all vectors and prepare them
      const validVectors = [];
      const validIds = [];
      
      for (let i = 0; i < vectors.length; i++) {
        const vector = vectors[i];
        const id = ids[i];
        
        try {
          // Convert to flat array of numbers
          const flatVector = this.flattenVector(vector).map(Number);
          
          // Validate vector dimensions
          if (flatVector.length !== this.dimensions) {
            console.error(`❌ Invalid vector dimensions for ID ${id}:`);
            console.error('Expected length:', this.dimensions);
            console.error('Actual length:', flatVector.length);
            continue; // Skip this vector
          }
          
          validVectors.push(flatVector);
          validIds.push(id);
        } catch (e) {
          console.error(`❌ Error processing vector ${i + 1}:`, e.message);
          continue; // Skip this vector
        }
      }
      
      if (validVectors.length === 0) {
        throw new Error('No valid vectors to add');
      }
      
      // Remove existing vectors with these IDs
      const existingIndices = [];
      for (const id of validIds) {
        const existingIndex = this.mapping.findIndex(m => m.id === id && !m.removed);
        if (existingIndex !== -1) {
          existingIndices.push(existingIndex);
        }
      }
      
      if (existingIndices.length > 0) {
        // Mark existing vectors as removed
        for (const idx of existingIndices) {
          this.mapping[idx].removed = true;
        }
      }
      
      // Add all valid vectors at once
      try {
        // Convert to a single Float32Array of length (n * dim) because
        // faiss-node expects a flat typed array (n vectors concatenated)
        const n = validVectors.length;
        const dim = this.dimensions;
        const concat = new Float32Array(n * dim);
        for (let i = 0; i < n; i++) {
          concat.set(validVectors[i], i * dim);
        }

        // Get current index size before adding (ntotal may be a property or function)
        const startIdx = (typeof this.index.ntotal === 'number')
          ? this.index.ntotal
          : (typeof this.index.ntotal === 'function' ? this.index.ntotal() : 0);

        // Add vectors to the index. Different versions of `faiss-node`
        // accept different input shapes. Log vector info to help debug
        // and try a few formats in order:
        // 1) flat plain JS Array (n * dim)
        // 2) flat Float32Array (n * dim)
        // 3) Array of Arrays [[...], [...]]
        // 4) Array of Float32Array
        let added = false;
        const errors = [];

        // Log diagnostics about vectors
        console.log('Vector diagnostics:');
        console.log(' - n vectors:', n);
        console.log(' - dim:', dim);
        console.log(' - first vector length:', validVectors[0].length);
        console.log(' - first element type:', typeof validVectors[0][0]);
        console.log(' - first vector is Array:', Array.isArray(validVectors[0]));
        console.log(' - sample values:', validVectors[0].slice(0, Math.min(8, validVectors[0].length)));

        // Attempt 1: plain JS Array (flat)
        try {
          const plainArray = Array.from(concat);
          await this.index.add(plainArray);
          added = true;
          console.log('Added using flat plain JS Array');
        } catch (err1) {
          errors.push(err1.message || String(err1));

          // Attempt 2: flat Float32Array
          try {
            await this.index.add(concat);
            added = true;
            console.log('Added using flat Float32Array');
          } catch (err2) {
            errors.push(err2.message || String(err2));

            // Attempt 3: Array of Arrays
            try {
              await this.index.add(validVectors);
              added = true;
              console.log('Added using Array of Arrays');
            } catch (err3) {
              errors.push(err3.message || String(err3));

              // Attempt 4: Array of Float32Array
              try {
                const float32Vectors = validVectors.map(v => new Float32Array(v));
                await this.index.add(float32Vectors);
                added = true;
                console.log('Added using Array of Float32Array');
              } catch (err4) {
                errors.push(err4.message || String(err4));
              }
            }
          }
        }

        if (!added) {
          throw new Error(`Failed to add vectors. Attempts: ${errors.join(' | ')}`);
        }
        
        // Update our mapping
        for (let i = 0; i < validIds.length; i++) {
          this.mapping.push({
            id: validIds[i],
            index: startIdx + i,
            removed: false
          });
        }
        
        console.log(`✅ Successfully added ${validVectors.length} vectors to index`);
        
        // Save the updated index and mapping
        await this.save();
        return { success: true, count: validVectors.length };
        
      } catch (error) {
        console.error('❌ Error adding vectors to FAISS index:', error.message);
        throw new Error(`Failed to add vectors: ${error.message}`);
      }
      
    } catch (error) {
      console.error('\n❌ Error in addVectors:', error.message);
      if (error.stack) {
        console.error(error.stack);
      }
      throw new Error(`Failed to add vectors: ${error.message}`);
    }
  }

  async search(queryVector, k = 5) {
    if (!this.isInitialized) await this.initialize();
    
    try {
      // Convert query vector to Float32Array
      const query = new Float32Array(queryVector);
      
      // Search the index
      const { labels, distances } = await this.index.search(query, k);
      
      // Convert FAISS indices back to our IDs
      return Array.from(labels[0])
        .map((index, i) => {
          const mapping = this.mapping[index];
          return mapping && !mapping.removed ? {
            id: mapping.id,
            score: 1 - (distances[0][i] / 2), // Convert L2 distance to similarity score (0-1)
            index
          } : null;
        })
        .filter(Boolean)
        .sort((a, b) => b.score - a.score);
        
    } catch (error) {
      console.error('Error searching vectors:', error);
      throw error;
    }
  }

  async removeVectors(ids) {
    if (!this.isInitialized) await this.initialize();
    
    try {
      let removedCount = 0;
      
      // Mark vectors as removed in our mapping
      for (const id of ids) {
        const index = this.mapping.findIndex(m => m.id === id && !m.removed);
        if (index !== -1) {
          this.mapping[index].removed = true;
          removedCount++;
        }
      }
      
      if (removedCount > 0) {
        // Save the updated mapping
        await this.save();
      }
      
      return { success: true, count: removedCount };
    } catch (error) {
      console.error('Error removing vectors:', error);
      throw error;
    }
  }

  async save() {
    if (!this.isInitialized) return;
    
    try {
      await ensureDataDir();
      
      // Save the current index
      await this.index.write(INDEX_PATH);
      
      // Filter out removed vectors and save mapping
      const activeMappings = this.mapping.filter(m => !m.removed);
      await writeFile(MAPPING_PATH, JSON.stringify(activeMappings, null, 2));
      
      console.log('✅ Successfully saved FAISS index and mapping');
    } catch (error) {
      console.error('Error saving FAISS index or mapping:', error);
      throw new Error(`Failed to save FAISS data: ${error.message}`);
    }
  }

  // Helper method to flatten nested arrays
  flattenVector(vector) {
    if (!Array.isArray(vector)) {
      return [vector];
    }
    return vector.flat(Infinity);
  }

  // Get the current size of the index
  async getIndexSize() {
    if (!this.isInitialized) await this.initialize();
    return this.mapping.filter(m => !m.removed).length;
  }

  // Verify index integrity
  async verifyIndex() {
    if (!this.isInitialized) await this.initialize();
    
    try {
      const activeMappings = this.mapping.filter(m => !m.removed);
      const size = activeMappings.length;
      
      console.log(`✅ Index has ${size} active vectors`);
      console.log(`✅ Mapping has ${this.mapping.length} total entries (${this.mapping.length - size} marked as removed)`);
      
      // Verify FAISS index size
      const faissSize = this.index.ntotal ? this.index.ntotal() : 0;
      console.log(`✅ FAISS reports ${faissSize} vectors`);
      
      return size === faissSize;
    } catch (error) {
      console.error('❌ Error verifying index:', error);
      return false;
    }
  }
}

// Export singleton instance
const vectorDB = new VectorDB();
export { vectorDB };