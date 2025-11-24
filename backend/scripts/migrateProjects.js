/**
 * Migration script to convert JSONL projects to MongoDB
 * Run with: node src/scripts/migrateProjects.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { connectDB } from '../src/config/database.js';
import Project from '../src/models/Project.js';
import { extractMaterials } from '../src/utils/extractMaterials.js';
import { getMaterialsEmbedding } from '../src/utils/getEmbedding.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATASET_PATH = path.resolve(__dirname, '../../data/projects.jsonl');

dotenv.config();

async function migrateProjects() {
  try {
    // Connect to database
    await connectDB();
    console.log('✅ Connected to MongoDB');

    // Check if JSONL file exists
    if (!fs.existsSync(DATASET_PATH)) {
      console.log('⚠️  No projects.jsonl file found. Skipping migration.');
      return;
    }

    // Read JSONL file
    const contents = fs.readFileSync(DATASET_PATH, 'utf-8').trim();
    if (!contents) {
      console.log('⚠️  projects.jsonl is empty. Skipping migration.');
      return;
    }

    const lines = contents.split('\n').filter((line) => line.trim());
    console.log(`📄 Found ${lines.length} projects in JSONL file`);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (let i = 0; i < lines.length; i++) {
      try {
        const projectData = JSON.parse(lines[i]);

        // Check if project already exists (by projectName)
        const existing = await Project.findOne({
          projectName: projectData.projectName || projectData.name,
        });

        if (existing) {
          console.log(`⏭️  Skipping duplicate: ${projectData.projectName || projectData.name}`);
          skipped++;
          continue;
        }

        // Extract and normalize materials
        const materialsText = (projectData.materials || [])
          .map((m) => (typeof m === 'string' ? m : m.name))
          .join(' ');
        const normalizedMaterials = extractMaterials(materialsText);

        // Generate embedding
        let embedding = [];
        try {
          if (normalizedMaterials.length > 0) {
            embedding = await getMaterialsEmbedding(normalizedMaterials);
          }
        } catch (error) {
          console.error(`⚠️  Failed to generate embedding for ${projectData.projectName}:`, error.message);
          // Continue without embedding
        }

        // Create project document
        const project = new Project({
          projectName: projectData.projectName || projectData.name || 'Unnamed Project',
          description: projectData.description || '',
          materials: Array.isArray(projectData.materials)
            ? projectData.materials.map((m) => {
                if (typeof m === 'string') {
                  return { name: m, quantity: '' };
                }
                return {
                  name: m.name || '',
                  quantity: m.quantity || '',
                };
              })
            : [],
          normalizedMaterials,
          embedding,
          steps: projectData.steps || [],
          referenceVideo: projectData.referenceVideo || '',
          status: 'completed', // All migrated projects are completed
          userRating: 0,
        });

        await project.save();
        migrated++;
        console.log(`✅ Migrated: ${project.projectName} (${i + 1}/${lines.length})`);
      } catch (error) {
        console.error(`❌ Error migrating project ${i + 1}:`, error.message);
        errors++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Migrated: ${migrated}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log('\n✨ Migration completed!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateProjects();

