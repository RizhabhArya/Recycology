import express from 'express';
import axios from 'axios';
import Project from '../models/Project.js';
import InputPromptCache from '../models/InputPromptCache.js';
import { protect, requireAdmin } from '../middleware/auth.js';
import { extractJson } from '../utils/extractJson.js';
import { extractMaterials } from '../utils/extractMaterials.js';
import { getMaterialsEmbedding } from '../utils/getEmbedding.js';
import { vectorDB } from '../utils/vectorDB.js';
import { calculateFinalScore } from '../utils/similarity.js';
import { systemPrompt } from '../prompts/systemPrompt.js';
import { phase1Prompt } from '../prompts/phase1Prompt.js';
import { verifyToken } from '../utils/jwt.js';
import PromptHistory from '../models/PromptHistory.js';

const router = express.Router();

const LLM_API_URL = 'http://127.0.0.1:1234/v1/chat/completions';
const LLM_MODEL = 'Qwen-Qwen2.5-7B-Instruct-GGUF';
const SIMILARITY_THRESHOLD = 0.8;
const MIN_MATCHES = 3;
const GENERATION_TIMEOUT = 180000; // 180 seconds (3 minutes) - give larger headroom for slow models

/**
 * Search for similar projects using vector similarity
 */
async function searchSimilarProjects(materials, embedding) {
  try {
    // Search the vector database
    const results = await vectorDB.search(embedding, 10); // Get top 10 matches
    
    if (results.length === 0) {
      return [];
    }
    
    // Get project details for the top matches
    const projectIds = results.map(r => r.id);
    const projects = await Project.find({
      _id: { $in: projectIds },
      status: 'completed'
    }).select('projectName normalizedMaterials userRating _id');
    
    // Map results with scores
    const projectsWithScores = results
      .filter(r => {
        // Filter by similarity threshold
        const project = projects.find(p => p._id.toString() === r.id);
        return project && r.score >= SIMILARITY_THRESHOLD;
      })
      .map(r => {
        const project = projects.find(p => p._id.toString() === r.id);
        if (!project) return null;
        
        return {
          _id: project._id,
          projectName: project.projectName,
          similarityScore: r.score,
          finalScore: calculateFinalScore(r.score, project.userRating || 0),
          userRating: project.userRating || 0,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.finalScore - a.finalScore);
      
    return projectsWithScores.slice(0, 5);
  } catch (error) {
    console.error('Error searching similar projects:', error);
    return [];
  }
}

/**
 * Generate Phase 1 project names using LLM
 */
async function generatePhase1Names(userPrompt) {
  try {
    const response = await axios.post(LLM_API_URL, {
      model: LLM_MODEL,
      messages: [
        { role: 'system', content: phase1Prompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 300, // Lower tokens for faster generation
    });

    const output = response.data?.choices?.[0]?.message?.content;
    if (!output) {
      throw new Error('No content returned from language model');
    }

    const projects = extractJson(output);

    // Ensure it's an array
    if (!Array.isArray(projects)) {
      return [{ name: projects.name || 'DIY Project' }];
    }

    // Extract just the names
    return projects.map((p) => ({
      name: p.name || p.projectName || 'DIY Project',
    }));
  } catch (error) {
    console.error('Error generating Phase 1 names:', error);
    throw error;
  }
}

/**
 * Generate full project details (Phase 2) in background with retry
 */
async function generateFullProjectDetails(projectName, userPrompt, materials, embedding, retryCount = 0) {
  const MAX_RETRIES = 2; // Retry a couple times for transient LLM/network issues

  // Defensive check: ensure we have a valid projectName before creating DB records.
  if (!projectName || typeof projectName !== 'string' || projectName.trim().length === 0) {
    const errMsg = 'generateFullProjectDetails called without a valid projectName';
    console.error(errMsg, { projectName, userPrompt });
    throw new Error(errMsg);
  }

  // Find existing project or create new one
  let project = await Project.findOne({ projectName, inputPrompt: userPrompt });

  if (!project) {
    project = new Project({
      projectName,
      normalizedMaterials: materials,
      embedding,
      inputPrompt: userPrompt,
      status: 'generating',
    });
    await project.save();
  } else if (project.status === 'completed') {
    // Already completed, return it
    return project;
  } else {
    // Update status to generating if it was failed
    project.status = 'generating';
    await project.save();
  }

  // Ensure the document has the lock set while we run generation; if lock is already held
  // by another worker, this function assumes the caller acquired the lock.
  try {
    console.log(`[${projectName}] Starting LLM generation...`);

    // Call LLM for full details (with improved error handling)
    let response;
    try {
      response = await axios.post(
        LLM_API_URL,
        {
          model: LLM_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: `Generate detailed instructions for this project: ${projectName}. Materials available: ${userPrompt}`,
            },
          ],
          temperature: 0.2,
          max_tokens: 1500, // Balanced tokens for details
        },
        {
          timeout: GENERATION_TIMEOUT,
        }
      );
    } catch (error) {
      // Normalize known network/axios errors and rethrow with friendlier message
      const code = error?.code || (error?.response && `HTTP_${error.response.status}`) || 'UNKNOWN';
      const status = error?.response?.status;
      const respData = error?.response?.data;

      if (code === 'ECONNABORTED' || (error.message && error.message.includes('timeout'))) {
        throw new Error(`LLM request timed out after ${GENERATION_TIMEOUT / 1000} seconds. The model may be slow or not responding.`);
      }
      if (code === 'ECONNREFUSED') {
        throw new Error('Cannot connect to LLM server. Is LM Studio or the LLM API running at the configured URL?');
      }
      if (code === 'ECONNRESET' || (error.message && error.message.includes('socket hang up'))) {
        throw new Error('Connection to LLM was reset (ECONNRESET / socket hang up). This is likely a transient network or server issue.');
      }

      // Unexpected HTTP error (400/500) — include response body to help debugging
      if (status) {
        const msg = `LLM HTTP ${status}: ${JSON.stringify(respData)}`;
        throw new Error(msg);
      }

      // Unknown error — rethrow
      throw error;
    }

    console.log(`[${projectName}] LLM response received, parsing...`);

    const output = response.data?.choices?.[0]?.message?.content;
    if (!output) {
      throw new Error('No content returned from language model');
    }

    let projects;
    try {
      projects = extractJson(output);
    } catch (parseError) {
      console.error(`[${projectName}] JSON parse error:`, parseError);
      throw new Error(`Failed to parse LLM response: ${parseError.message}`);
    }

    // Find the project that matches our projectName
    let fullProject = null;
    if (Array.isArray(projects)) {
      fullProject = projects.find(
        (p) => p.projectName === projectName || p.name === projectName
      ) || projects[0];
    } else {
      fullProject = projects;
    }

    if (!fullProject) {
      throw new Error('No matching project found in LLM response');
    }

    // Update project with full details
    project.projectName = fullProject.projectName || projectName;
    project.description = fullProject.description || '';
    project.materials = fullProject.materials || [];
    project.steps = fullProject.steps || [];
    project.referenceVideo = fullProject.referenceVideo || '';
    project.status = 'completed';

    await project.save();

    console.log(`[${projectName}] ✅ Successfully generated and saved!`);
    return project;
  } catch (error) {
    const errorMsg = error.message || error.toString();
    console.error(`[${projectName}] Error generating full details (attempt ${retryCount + 1}/${MAX_RETRIES + 1}):`, errorMsg);

    // Check if it's a connection/timeout error
    if (errorMsg.includes('timeout') || errorMsg.includes('ECONNREFUSED') || errorMsg.includes('ECONNABORTED')) {
      console.error(`[${projectName}] LLM connection issue detected. Check if LM Studio is running and the model is loaded.`);
    }

    // Retry if we haven't exceeded max retries
    if (retryCount < MAX_RETRIES) {
      const waitTime = 3000 * (retryCount + 1); // Exponential backoff: 3s, 6s, 9s
      console.log(`[${projectName}] Retrying in ${waitTime / 1000} seconds...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      return generateFullProjectDetails(projectName, userPrompt, materials, embedding, retryCount + 1);
    }

    // Mark as failed after max retries
    console.error(`[${projectName}] ❌ Failed after ${MAX_RETRIES + 1} attempts. Marking as failed.`);
    project.status = 'failed';
    project.description = `Generation failed: ${errorMsg}`;
    await project.save();

    throw error;
  } finally {
    // Ensure we clear the generation lock regardless of success/failure so other workers
    // or streams can attempt generation or fetch results.
    try {
      await Project.findByIdAndUpdate(project._id, { $set: { generationLock: false, generationBy: '', generationStartedAt: null } });
    } catch (clearErr) {
      console.error(`[${projectName}] Failed to clear generation lock:`, clearErr.message || clearErr);
    }
  }

}

/**
 * Main POST route - Phase 1: Fast project name suggestions
 */
router.post('/', async (req, res) => {
  const userPrompt = req.body?.materials;

  if (!userPrompt || typeof userPrompt !== 'string') {
    return res.status(400).json({
      error: 'Please provide a materials string in the request body',
    });
  }

  try {
    // Save prompt to user history if Authorization header provided (optional)
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);
        if (decoded && decoded.userId) {
          // Upsert history entry asynchronously (don't block main flow).
          // We update `updatedAt` so recent prompts move to the top, and avoid duplicates.
          (async () => {
            try {
              await PromptHistory.findOneAndUpdate(
                { user: decoded.userId, prompt: userPrompt.trim() },
                { $set: { prompt: userPrompt.trim() }, $setOnInsert: { user: decoded.userId }, $currentDate: { updatedAt: true } },
                { upsert: true, new: true }
              );
            } catch (e) {
              // If the unique index triggers a duplicate error due to race, ignore it.
              if (e && e.code && e.code === 11000) return;
              console.error('Failed to save prompt history:', e.message || e);
            }
          })();
        }
      }
    } catch (e) {
      // ignore history saving errors
      console.error('Prompt history save attempt failed:', e.message || e);
    }
    // Step 1: Check cache first
    const cached = await InputPromptCache.findOne({ prompt: userPrompt.trim() });
    if (cached && cached.resultsProjectIds.length > 0) {
      const cachedProjects = await Project.find({
        _id: { $in: cached.resultsProjectIds },
      }).select('projectName description materials steps referenceVideo _id status');

      // Update last accessed
      cached.lastAccessed = new Date();
      await cached.save();

      return res.json({
        projects: cachedProjects.map((p) => ({
          id: p._id.toString(),
          projectName: p.projectName,
          description: p.description || '',
          materials: p.materials || [],
          steps: p.steps || [],
          referenceVideo: p.referenceVideo || '',
          status: p.status || 'completed',
        })),
        cached: true,
      });
    }

    // Step 2: Extract and normalize materials
    const materials = extractMaterials(userPrompt);
    if (materials.length === 0) {
      return res.status(400).json({
        error: 'Could not extract materials from input. Please provide material names.',
      });
    }

    // Step 3: Generate embedding
    const embedding = await getMaterialsEmbedding(materials);

    // Step 4: Search database for similar projects
    const dbMatches = await searchSimilarProjects(materials, embedding);

    let projectNames = [];

    if (dbMatches.length >= MIN_MATCHES && dbMatches[0].similarityScore >= SIMILARITY_THRESHOLD) {
      // Use database results
      // Fetch full project details for DB matches
      const dbProjectIds = dbMatches.map((m) => m._id);
      const dbProjects = await Project.find({
        _id: { $in: dbProjectIds },
      }).select('projectName description materials steps referenceVideo status');

      projectNames = dbProjects.map((project) => ({
        id: project._id.toString(),
        projectName: project.projectName,
        description: project.description || '',
        materials: project.materials || [],
        steps: project.steps || [],
        referenceVideo: project.referenceVideo || '',
        status: project.status || 'completed',
      }));

      // Cache the results
      await InputPromptCache.findOneAndUpdate(
        { prompt: userPrompt.trim() },
        {
          prompt: userPrompt.trim(),
          resultsProjectIds: dbMatches.map((m) => m._id),
          embedding,
          lastAccessed: new Date(),
        },
        { upsert: true, new: true }
      );
    } else {
      // Step 5: Generate Phase 1 names using LLM
      const phase1Results = await generatePhase1Names(userPrompt);
      projectNames = phase1Results.map((p) => ({
        projectName: p.name,
        status: 'generating', // Will be updated when background generation completes
      }));

      // Create projects in DB with 'generating' status
      const newProjects = await Promise.all(
        projectNames.map(async (p) => {
          const project = new Project({
            projectName: p.projectName,
            normalizedMaterials: materials,
            embedding,
            inputPrompt: userPrompt,
            status: 'generating',
          });
          await project.save();
          return { id: project._id.toString(), projectName: p.projectName, status: 'generating' };
        })
      );

      projectNames = newProjects;

      // Cache the results
      await InputPromptCache.findOneAndUpdate(
        { prompt: userPrompt.trim() },
        {
          prompt: userPrompt.trim(),
          resultsProjectIds: newProjects.map((p) => p.id),
          embedding,
          lastAccessed: new Date(),
        },
        { upsert: true, new: true }
      );
    }

    // Step 6: Start background generation sequentially (one at a time)
    // Acquire an atomic lock per project to avoid duplicate LLM runs
    (async () => {
      const generatingProjects = projectNames.filter(
        (p) => p.status === 'generating' && p.id && p.projectName
      );

      for (const project of generatingProjects) {
        try {
          // Try to acquire lock atomically. If another worker has the lock,
          // skip generation for this project (it will be handled elsewhere).
          const locked = await Project.findOneAndUpdate(
            { _id: project.id, generationLock: { $ne: true } },
            { $set: { generationLock: true, generationBy: 'background', generationStartedAt: new Date() } },
            { new: true }
          );

          if (!locked) {
            console.log(`Skipping background generation for ${project.projectName} — lock held by another worker`);
            continue;
          }

          // Acquire succeeded — run generation (generateFullProjectDetails will clear the lock when done)
          await generateFullProjectDetails(
            project.projectName,
            userPrompt,
            materials,
            embedding
          );
          console.log(`✅ Completed: ${project.projectName}`);

          // Clear lock as a safety (generateFullProjectDetails should already clear it)
          try {
            await Project.findByIdAndUpdate(project.id, { $set: { generationLock: false, generationBy: '', generationStartedAt: null } });
          } catch (upErr) {
            console.error('Failed to clear generation lock after background generation:', upErr.message || upErr);
          }
        } catch (error) {
          console.error(`❌ Failed: ${project.projectName}`, error.message || error);
          // Ensure we clear the lock so another worker can retry
          try {
            await Project.findByIdAndUpdate(project.id, { $set: { generationLock: false, generationBy: '', generationStartedAt: null, status: 'failed', description: `Background generation failed: ${error.message || error}` } });
          } catch (u) {
            console.error('Failed to mark project failed / clear lock:', u.message || u);
          }
          // Continue with next project even if one fails
        }
      }
    })().catch((error) => {
      console.error('Error in background generation:', error);
    });

    // Step 7: Return immediately (don't wait for background generation)
    res.json({
      projects: projectNames,
      cached: false,
    });
  } catch (err) {
    console.error('Error in generate route:', err);
    const message = err?.response?.data?.error || err.message || 'Unknown error';
    res.status(500).json({
      error: message,
      raw: err?.response?.data,
    });
  }
});

/**
 * GET /api/generate/history
 * Returns the last 5 prompts for the authenticated user
 */
router.get('/history', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    // Sort by most recently used (updatedAt) so upserts move prompts to the top
    const entries = await PromptHistory.find({ user: userId })
      .sort({ updatedAt: -1 })
      .limit(5)
      .select('_id prompt updatedAt');

    res.json({ prompts: entries.map((e) => ({ id: e._id.toString(), prompt: e.prompt, updatedAt: e.updatedAt })) });
  } catch (error) {
    console.error('Error fetching prompt history:', error);
    res.status(500).json({ error: 'Failed to fetch prompt history' });
  }
});

// DELETE a prompt history entry
router.delete('/history/:id', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const id = req.params.id;
    const entry = await PromptHistory.findById(id);
    if (!entry) return res.status(404).json({ error: 'Prompt not found' });
    if (entry.user.toString() !== userId.toString()) return res.status(403).json({ error: 'Not allowed' });

    await PromptHistory.deleteOne({ _id: id });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting prompt history:', error);
    res.status(500).json({ error: 'Failed to delete prompt entry' });
  }
});

/**
 * Admin endpoint: Re-run generation for a specific project ID
 * POST /api/generate/retry/:id?wait=true
 * - If `wait=true` the request will wait for generation to finish (may timeout depending on model).
 * - Otherwise it starts generation in background and returns 202 Accepted.
 * NOTE: This endpoint is not authenticated — restrict it in production.
 */
router.post('/retry/:id', protect, requireAdmin, async (req, res) => {
  const projectId = req.params.id;
  const wait = req.query.wait === 'true';

  try {
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!project.projectName) {
      return res.status(400).json({ error: 'Project has no projectName to regenerate' });
    }

    // Ensure we have materials and embedding to call the generation function
    let materials = project.normalizedMaterials && project.normalizedMaterials.length > 0
      ? project.normalizedMaterials
      : extractMaterials(project.inputPrompt || '');

    if (!materials || materials.length === 0) {
      return res.status(400).json({ error: 'No materials available to regenerate this project' });
    }

    let embedding = project.embedding;
    if (!embedding || embedding.length === 0) {
      try {
        embedding = await getMaterialsEmbedding(materials);
      } catch (e) {
        console.error('Failed to compute embedding for retry:', e);
        return res.status(500).json({ error: 'Failed to compute embedding', detail: e.message });
      }
    }

    // Mark as generating and start regeneration
    await Project.findByIdAndUpdate(project._id, { $set: { status: 'generating', normalizedMaterials: materials, embedding } });

    if (wait) {
      try {
        const updated = await generateFullProjectDetails(project.projectName, project.inputPrompt || '', materials, embedding);
        return res.json({ project: updated });
      } catch (err) {
        console.error('Error while waiting for regeneration:', err);
        return res.status(500).json({ error: err.message });
      }
    }

    // Start in background and return immediately
    (async () => {
      try {
        await generateFullProjectDetails(project.projectName, project.inputPrompt || '', materials, embedding);
      } catch (err) {
        console.error('Background regeneration failed for project', projectId, err.message || err);
      }
    })();

    return res.status(202).json({ id: project._id.toString(), status: 'generating' });
  } catch (error) {
    console.error('Retry endpoint error:', error);
    return res.status(500).json({ error: error.message || 'Unknown error' });
  }
});

/**
 * Admin: list failed projects (paginated)
 * GET /api/generate/failed?page=1&limit=20
 */
router.get('/failed', protect, requireAdmin, async (req, res) => {
  const page = parseInt(req.query.page || '1', 10);
  const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);

  try {
    const query = { status: 'failed' };
    const total = await Project.countDocuments(query);
    const projects = await Project.find(query)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('projectName description inputPrompt status createdAt updatedAt');

    res.json({ page, limit, total, projects });
  } catch (error) {
    console.error('Error listing failed projects:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Admin: set role for a user
 * POST /api/generate/admin/users/:id/role  { role: 'admin' }
 */
router.post('/admin/users/:id/role', protect, requireAdmin, async (req, res) => {
  const userId = req.params.id;
  const { role } = req.body;

  if (!['user', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  try {
    const user = await (await import('../models/User.js')).default.findByIdAndUpdate(userId, { $set: { role } }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'Role updated', user });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET route - Phase 2: Get full project details by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // If still generating, return status
    if (project.status === 'generating') {
      return res.json({
        project: {
          id: project._id,
          projectName: project.projectName,
          status: 'generating',
        },
        message: 'Project is still being generated. Please check status endpoint.',
      });
    }

    // If failed, return error
    if (project.status === 'failed') {
      return res.status(500).json({
        error: 'Project generation failed. Please try again.',
      });
    }

    // Return full project details
    res.json({
      project: {
        id: project._id,
        projectName: project.projectName,
        description: project.description,
        materials: project.materials,
        steps: project.steps,
        referenceVideo: project.referenceVideo,
        status: project.status,
        userRating: project.userRating,
        createdAt: project.createdAt,
      },
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET route - Check project generation status
 */
router.get('/:id/status', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).select('status projectName');

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({
      id: project._id,
      projectName: project.projectName,
      status: project.status,
    });
  } catch (error) {
    console.error('Error checking project status:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
