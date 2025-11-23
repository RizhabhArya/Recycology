import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATASET_PATH = path.resolve(__dirname, '../../data/projects.jsonl');

const readDataset = () => {
  if (!fs.existsSync(DATASET_PATH)) {
    return [];
  }

  const contents = fs.readFileSync(DATASET_PATH, 'utf-8').trim();
  if (!contents) {
    return [];
  }

  return contents.split('\n').map((line) => JSON.parse(line));
};

router.get('/', (req, res) => {
  const query = req.query?.materials;

  if (!query) {
    return res.status(400).json({ error: 'materials query parameter is required' });
  }

  const terms = query
    .split(',')
    .map((term) => term.trim().toLowerCase())
    .filter(Boolean);

  if (!terms.length) {
    return res.status(400).json({ error: 'Provide at least one material term' });
  }

  try {
    const allProjects = readDataset();

    const matches = allProjects.filter((project) => {
      const materials = (project.materials || []).map((m) => m.name?.toLowerCase());
      return terms.every((term) => materials.includes(term));
    });

    res.json({ matches });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;


