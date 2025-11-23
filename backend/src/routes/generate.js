import express from 'express';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractJson } from '../utils/extractJson.js';
import { systemPrompt } from '../prompts/systemPrompt.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATASET_PATH = path.resolve(__dirname, '../../data/projects.jsonl');

router.post('/', async (req, res) => {
  const userPrompt = req.body?.materials;

  if (!userPrompt || typeof userPrompt !== 'string') {
    return res
      .status(400)
      .json({ error: 'Please provide a materials string in the request body' });
  }

  try {
    const response = await axios.post('http://127.0.0.1:1234/v1/chat/completions', {
      model: 'Qwen-Qwen2.5-7B-Instruct-GGUF',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 800,
    });

    const output = response.data?.choices?.[0]?.message?.content;
    if (!output) {
      throw new Error('No content returned from language model');
    }

    const projects = extractJson(output);

    // Ensure dataset directory exists
    const datasetDir = path.dirname(DATASET_PATH);
    if (!fs.existsSync(datasetDir)) {
      fs.mkdirSync(datasetDir, { recursive: true });
    }

    projects.forEach((project) => {
      fs.appendFileSync(DATASET_PATH, `${JSON.stringify(project)}\n`);
    });

    res.json({ projects });
  } catch (err) {
    const message = err?.response?.data?.error || err.message || 'Unknown error';
    res.status(500).json({ error: message, raw: err?.response?.data });
  }
});

export default router;