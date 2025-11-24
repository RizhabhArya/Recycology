// scripts/testVectorAddition.js
import { vectorDB } from '../src/utils/vectorDB.js';

// Test with a small set of sample vectors
async function testVectorAddition() {
  try {
    console.log('Starting vector addition test...');
    
    // Sample vectors (3 vectors of dimension 384)
    const testVectors = [
      new Array(384).fill(0.1),  // All 0.1s
      new Array(384).fill(0.2),  // All 0.2s
      new Array(384).fill(0.3)   // All 0.3s
    ];
    
    // Test IDs
    const testIds = ['test1', 'test2', 'test3'];
    
    console.log('Adding test vectors...');
    const result = await vectorDB.addVectors(testVectors, testIds);
    console.log('Add vectors result:', result);
    
    // Test search
    console.log('\nTesting search...');
    const queryVector = new Array(384).fill(0.15); // Should be closest to the first vector
    const searchResults = await vectorDB.search(queryVector, 3);
    console.log('Search results:', searchResults);
    
    console.log('\nTest completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

testVectorAddition();