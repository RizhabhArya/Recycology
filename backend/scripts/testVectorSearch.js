import { vectorDB } from '../src/utils/vectorDB.js';
import { getMaterialsEmbedding } from '../src/utils/getEmbedding.js';

async function testSearch() {
  try {
    console.log('Initializing vector database...');
    await vectorDB.initialize();
    
    // Example search
    const materials = ['metal scraps', 'detonators', 'uranium'];
    console.log('Generating embedding for materials:', materials);
    
    const embedding = await getMaterialsEmbedding(materials);
    console.log('Searching for similar projects...');
    
    const results = await vectorDB.search(embedding, 5);
    console.log('Search results:', JSON.stringify(results, null, 2));
  } catch (error) {
    console.error('Error in test search:', error);
  } finally {
    process.exit(0);
  }
}

testSearch();
EOL