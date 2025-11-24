import express from 'express';
import axios from 'axios';
import Project from '../models/Project.js';
import { extractJson } from '../utils/extractJson.js';
import { systemPrompt } from '../prompts/systemPrompt.js';

const router = express.Router();

const LLM_API_URL = 'http://127.0.0.1:1234/v1/chat/completions';
const LLM_MODEL = 'Qwen-Qwen2.5-7B-Instruct-GGUF';
const GENERATION_TIMEOUT = 180000; // match non-stream timeout and give more headroom

/**
 * SSE endpoint for streaming project generation progress
 * GET /api/generate/stream/:id
 */
router.get('/stream/:id', async (req, res) => {
  const projectId = req.params.id;

  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  const sendEvent = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    // Find the project
    const project = await Project.findById(projectId);
    if (!project) {
      sendEvent('error', { message: 'Project not found' });
      res.end();
      return;
    }

    // If already completed, send immediately
    if (project.status === 'completed') {
      sendEvent('complete', {
        project: {
          id: project._id.toString(),
          projectName: project.projectName,
          description: project.description,
          materials: project.materials,
          steps: project.steps,
          referenceVideo: project.referenceVideo,
        },
      });
      res.end();
      return;
    }

    // Send initial status
    sendEvent('status', {
      status: 'generating',
      message: `Generating details for ${project.projectName}...`,
      progress: 0,
    });
    // If generation is already in progress by a background worker, poll for completion
    if (project.status === 'generating' && project.generationLock) {
      // Poll the DB for status updates and return when project is completed/failed
      const start = Date.now();
      const timeout = GENERATION_TIMEOUT; // same as other endpoints
      const pollInterval = 1000; // 1s

      const poll = async () => {
        try {
          const current = await Project.findById(projectId).select('status projectName description materials steps referenceVideo');
          if (!current) {
            sendEvent('error', { message: 'Project disappeared' });
            res.end();
            return;
          }

          if (current.status === 'completed') {
            sendEvent('complete', {
              project: {
                id: current._id.toString(),
                projectName: current.projectName,
                description: current.description,
                materials: current.materials,
                steps: current.steps,
                referenceVideo: current.referenceVideo,
              },
            });
            res.end();
            return;
          }

          if (current.status === 'failed') {
            sendEvent('error', { message: 'Project generation failed' });
            res.end();
            return;
          }

          if (Date.now() - start > timeout) {
            sendEvent('error', { message: 'Timed out waiting for generation' });
            res.end();
            return;
          }

          // Not done yet; send a keepalive status and poll again
          sendEvent('status', { status: 'generating', message: 'Waiting for background generation to finish...' });
          setTimeout(poll, pollInterval);
        } catch (err) {
          console.error('Error polling project while locked:', err);
          sendEvent('error', { message: 'Error polling project status' });
          res.end();
        }
      };

      poll();
      return;
    }

    // If not locked, attempt to acquire the lock and stream generation ourselves
    let lockAcquired = false;
    try {
      const locked = await Project.findOneAndUpdate(
        { _id: projectId, generationLock: { $ne: true } },
        { $set: { generationLock: true, generationBy: 'stream', generationStartedAt: new Date(), status: 'generating' } },
        { new: true }
      );

      if (!locked) {
        // Someone else acquired the lock in the meantime; fallback to polling
        sendEvent('status', { status: 'generating', message: 'Another worker is generating details; waiting...' });
        const start = Date.now();
        const timeout = GENERATION_TIMEOUT;
        const pollInterval = 1000;
        const poll = async () => {
          try {
            const current = await Project.findById(projectId).select('status projectName description materials steps referenceVideo');
            if (!current) {
              sendEvent('error', { message: 'Project disappeared' });
              res.end();
              return;
            }
            if (current.status === 'completed') {
              sendEvent('complete', {
                project: {
                  id: current._id.toString(),
                  projectName: current.projectName,
                  description: current.description,
                  materials: current.materials,
                  steps: current.steps,
                  referenceVideo: current.referenceVideo,
                },
              });
              res.end();
              return;
            }
            if (current.status === 'failed') {
              sendEvent('error', { message: 'Project generation failed' });
              res.end();
              return;
            }
            if (Date.now() - start > timeout) {
              sendEvent('error', { message: 'Timed out waiting for generation' });
              res.end();
              return;
            }
            setTimeout(poll, pollInterval);
          } catch (err) {
            console.error('Error polling for completion after failed lock:', err);
            sendEvent('error', { message: 'Polling error' });
            res.end();
          }
        };
        poll();
        return;
      }

      lockAcquired = true;

      // Proceed to call LLM with streaming (same as previous logic)
      const response = await axios.post(
        LLM_API_URL,
        {
          model: LLM_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: `Generate detailed instructions for this project: ${project.projectName}. Materials available: ${project.inputPrompt}`,
            },
          ],
          temperature: 0.2,
          max_tokens: 1500,
          stream: true, // Enable streaming
        },
        {
          timeout: GENERATION_TIMEOUT,
          responseType: 'stream',
        }
      );

      let fullResponse = '';
      let buffer = '';

      // Stream the response
      response.data.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || '';
              if (content) {
                fullResponse += content;
                // Send progress update
                sendEvent('progress', {
                  content,
                  accumulated: fullResponse.length,
                });
              }
            } catch (e) {
              // Ignore parse errors for incomplete JSON
            }
          }
        }
      });

      response.data.on('end', async () => {
        try {
          // Parse the complete response
          const projects = extractJson(fullResponse);
          let fullProject = null;

          if (Array.isArray(projects)) {
            fullProject = projects.find(
              (p) => p.projectName === project.projectName || p.name === project.projectName
            ) || projects[0];
          } else {
            fullProject = projects;
          }

          if (!fullProject) {
            throw new Error('No matching project found in LLM response');
          }

          // Update project atomically to avoid VersionError from concurrent updates
          const update = {
            projectName: fullProject.projectName || project.projectName,
            description: fullProject.description || '',
            materials: fullProject.materials || [],
            steps: fullProject.steps || [],
            referenceVideo: fullProject.referenceVideo || '',
            status: 'completed',
          };

          try {
            const updated = await Project.findByIdAndUpdate(project._id, { $set: update }, { new: true, runValidators: true });

            // Send completion using the updated document when available
            sendEvent('complete', {
              project: {
                id: updated._id.toString(),
                projectName: updated.projectName,
                description: updated.description,
                materials: updated.materials,
                steps: updated.steps,
                referenceVideo: updated.referenceVideo,
              },
            });
          } catch (saveErr) {
            // If atomic update fails for any reason, mark as failed with a fallback update
            console.error('Error saving streamed result via findByIdAndUpdate:', saveErr);
            try {
              await Project.updateOne({ _id: project._id }, { $set: { status: 'failed', description: `Stream save failed: ${saveErr.message}` } });
            } catch (fallbackErr) {
              console.error('Fallback update also failed:', fallbackErr);
            }
            sendEvent('error', { message: saveErr.message });
          }
        } catch (error) {
          console.error('Error processing streamed response:', error);
          // Use atomic update to mark the project failed
          try {
            await Project.findByIdAndUpdate(project._id, { $set: { status: 'failed', description: `Stream error: ${error.message}` } }, { new: false });
          } catch (upErr) {
            console.error('Failed to mark project as failed after stream error:', upErr);
          }
          sendEvent('error', { message: error.message });
        } finally {
          // Clear lock since we acquired it for streaming
          try {
            await Project.findByIdAndUpdate(project._id, { $set: { generationLock: false, generationBy: '', generationStartedAt: null } });
          } catch (clearErr) {
            console.error('Failed to clear generation lock after stream:', clearErr.message || clearErr);
          }
          res.end();
        }
      });

      response.data.on('error', async (error) => {
        console.error('Stream error:', error);
        try {
          await Project.findByIdAndUpdate(project._id, { $set: { status: 'failed', description: `Stream error: ${error.message}` } });
        } catch (upErr) {
          console.error('Failed to mark project as failed after stream error:', upErr);
        }
        // Clear lock since we acquired it
        try {
          await Project.findByIdAndUpdate(project._id, { $set: { generationLock: false, generationBy: '', generationStartedAt: null } });
        } catch (clearErr) {
          console.error('Failed to clear generation lock after stream error:', clearErr.message || clearErr);
        }
        sendEvent('error', { message: error.message });
        res.end();
      });
    } catch (error) {
      console.error('LLM request error:', error);
      // Clear lock if we acquired it
      if (lockAcquired) {
        try {
          await Project.findByIdAndUpdate(project._id, { $set: { generationLock: false, generationBy: '', generationStartedAt: null } });
        } catch (clearErr) {
          console.error('Failed to clear generation lock after LLM error:', clearErr.message || clearErr);
        }
      }
      try {
        await Project.findByIdAndUpdate(project._id, { $set: { status: 'failed', description: error.message || 'LLM request failed' } });
      } catch (upErr) {
        console.error('Failed to mark project as failed after LLM request error:', upErr);
      }
      sendEvent('error', {
        message: error.message || 'Failed to generate project details',
      });
      res.end();
    }
  } catch (error) {
    console.error('Stream setup error:', error);
    sendEvent('error', { message: error.message });
    res.end();
  }

  // Handle client disconnect
  req.on('close', () => {
    res.end();
  });
});

export default router;

