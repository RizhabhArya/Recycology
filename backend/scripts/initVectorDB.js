// scripts/initVectorDB.js
import mongoose from 'mongoose';
import { vectorDB } from '../src/utils/vectorDB.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Debug log to verify environment variables
console.log('MongoDB URI:', process.env.MONGODB_URI ? 'Found' : 'Missing');

if (!process.env.MONGODB_URI) {
  console.error('❌ Error: MONGODB_URI environment variable is not set');
  console.log('Please make sure you have a .env file with MONGODB_URI in your project root.');
  process.exit(1);
}

async function initVectorDB() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');
    
    // Initialize vector DB
    await vectorDB.initialize();
    
    // Get all projects with embeddings
    const projects = await mongoose.connection.db.collection('projects')
      .find({
        embedding: { $exists: true, $ne: null },
        status: 'completed'
      })
      .project({ _id: 1, embedding: 1 })
      .toArray();

    console.log(`📊 Found ${projects.length} projects with embeddings`);
    
    if (projects.length > 0) {
      // Add all embeddings to the vector index
      const vectors = projects.map(p => p.embedding);
      const ids = projects.map(p => p._id.toString());
      
      console.log('🔄 Adding vectors to FAISS index...');
      await vectorDB.addVectors(vectors, ids);
      console.log('✅ Vector database initialized successfully');
    } else {
      console.log('ℹ️ No projects with embeddings found');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing vector database:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

initVectorDB();