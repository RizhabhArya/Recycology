import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastContext';
import axios from 'axios';
import './Dashboard.css';
import ProjectModal from '../components/ProjectModal';
import CommunityModal from '../components/CommunityModal';

const Dashboard = () => {
  const { user } = useAuth();
  const [savedIdeas, setSavedIdeas] = useState([]);
  const [myPosts, setMyPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [materialsInput, setMaterialsInput] = useState('');
  const [projects, setProjects] = useState([]);
  const [recentPrompts, setRecentPrompts] = useState([]);
  const [savedProjects, setSavedProjects] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [expandedProject, setExpandedProject] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [loadingProjects, setLoadingProjects] = useState({}); // Track which projects are loading

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const materialSuggestions = [
    // 'I got three mason jars, twine and some tea lights',
    // 'I have some Scrap pallet wood, nails and one litre chalk paint',
    // 'I got a ladder, 1 dice, 3 paper pages and tapes with some sticks',
    // 'I got one stapler, paper, graph paper, colored papers, pen , pencil , tapes',
  ];

  useEffect(() => {
    fetchUserData();
    fetchRecentPrompts();
    fetchSavedProjects();
  }, []);

  const navigate = useNavigate();
  const { addToast } = useToast();

  const handleImportToCreate = (project) => {
    // pass the AI-generated project to the CreatePost page
    navigate('/create-post', { state: { project } });
  };

  const openProjectModal = (id) => {
    setSelectedProjectId(id);
  };

  const closeProjectModal = () => setSelectedProjectId(null);

  const openPostModal = (id) => setSelectedPostId(id);

  const closePostModal = () => setSelectedPostId(null);

  const fetchUserData = async () => {
    try {
      const [ideasRes, postsRes] = await Promise.all([
        axios.get(`${API_URL}/ideas/saved`),
        axios.get(`${API_URL}/community/my-posts`),
      ]);
      setSavedIdeas(ideasRes.data.data.ideas || []);
      setMyPosts(postsRes.data.data.posts || []);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentPrompts = async () => {
    try {
      const response = await axios.get(`${API_URL}/generate/history`);
      setRecentPrompts(response.data.prompts || []);
    } catch (error) {
      // ignore if unauthenticated or endpoint not available
      // console.error('Failed to fetch recent prompts:', error);
    }
  };

  const fetchSavedProjects = async () => {
    try {
      const response = await axios.get(`${API_URL}/projects/saved`);
      setSavedProjects(response.data.projects || response.data.data?.projects || []);
    } catch (error) {
      // ignore if unauthenticated or endpoint not available
    }
  };

  const generateProjects = async () => {
    if (!materialsInput.trim()) {
      setGenerateError('Please describe the materials you have.');
      return;
    }

    setIsGenerating(true);
    setGenerateError('');

    try {
      const response = await axios.post(`${API_URL}/generate`, {
        materials: materialsInput.trim(),
      });
      
      // Backend returns: { projects: [{ id, projectName, status, ...details? }, ...] }
      const projectNames = response.data.projects || [];
      
      // Transform to match frontend format
      // If project has description/materials/steps, it's complete; otherwise it's Phase 1
      const transformedProjects = projectNames.map((p) => ({
        id: p.id,
        projectName: p.projectName,
        status: p.status || 'generating',
        description: p.description || '',
        materials: p.materials || [],
        steps: p.steps || [],
        referenceVideo: p.referenceVideo || '',
        isPhase1: !p.description && !p.materials?.length, // Flag to indicate we need to fetch details
      }));
      
      setProjects(transformedProjects);
      
      // Start polling for projects that are generating
      transformedProjects.forEach((project) => {
        if (project.status === 'generating' && project.id) {
          pollProjectStatus(project.id);
        }
      });
      // Refresh recent prompts (the server upserts history asynchronously)
      fetchRecentPrompts();
      // refresh saved projects in case user saved something
      fetchSavedProjects();
    } catch (error) {
      const message =
        error.response?.data?.error || 'Failed to generate DIY projects';
      setGenerateError(message);
      console.error('Generate error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Poll project status until it's completed
  const pollProjectStatus = async (projectId) => {
    const maxAttempts = 30; // 30 attempts * 2 seconds = 60 seconds max
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await axios.get(`${API_URL}/generate/${projectId}/status`);
        const { status } = response.data;

        if (status === 'completed') {
          // Fetch full details
          await fetchProjectDetails(projectId);
        } else if (status === 'failed') {
          setLoadingProjects((prev) => ({ ...prev, [projectId]: 'failed' }));
          // Update project status in the list
          setProjects((prevProjects) =>
            prevProjects.map((p) =>
              p.id === projectId ? { ...p, status: 'failed' } : p
            )
          );
        } else if (status === 'generating' && attempts < maxAttempts) {
          // Still generating, poll again in 2 seconds
          attempts++;
          setTimeout(poll, 2000);
        } else if (attempts >= maxAttempts) {
          // Timeout
          setLoadingProjects((prev) => ({ ...prev, [projectId]: 'timeout' }));
          console.error(`Project ${projectId} generation timed out`);
        }
      } catch (error) {
        console.error(`Error polling project ${projectId}:`, error);
        setLoadingProjects((prev) => ({ ...prev, [projectId]: 'error' }));
      }
    };

    poll();
  };

  // Fetch full project details with SSE streaming
  const fetchProjectDetails = async (projectId) => {
    try {
      setLoadingProjects((prev) => ({ ...prev, [projectId]: 'loading' }));

      // Check if project is already completed (quick check)
      const quickCheck = await axios.get(`${API_URL}/generate/${projectId}`);
      const quickProject = quickCheck.data.project;

      if (quickProject.status === 'completed' && (quickProject.description || quickProject.materials?.length)) {
        // Already completed, update immediately
        setProjects((prevProjects) =>
          prevProjects.map((p) =>
            p.id === projectId
              ? {
                  ...quickProject,
                  id: projectId,
                  isPhase1: false,
                }
              : p
          )
        );
        setLoadingProjects((prev) => ({ ...prev, [projectId]: 'completed' }));
        return;
      }

      // Use SSE streaming for real-time updates
      const eventSource = new EventSource(`${API_URL}/generate/stream/${projectId}`);
      let accumulatedContent = '';

      eventSource.addEventListener('status', (e) => {
        const data = JSON.parse(e.data);
        setLoadingProjects((prev) => ({
          ...prev,
          [projectId]: { status: 'generating', message: data.message, progress: data.progress },
        }));
      });

      eventSource.addEventListener('progress', (e) => {
        const data = JSON.parse(e.data);
        accumulatedContent += data.content;
        
        // Update UI with streaming progress (optional - can show "Generating..." with character count)
        setLoadingProjects((prev) => ({
          ...prev,
          [projectId]: {
            status: 'generating',
            message: `Generating... (${data.accumulated} chars)`,
            progress: Math.min(90, (data.accumulated / 2000) * 100), // Estimate progress
          },
        }));
      });

      eventSource.addEventListener('complete', (e) => {
        const data = JSON.parse(e.data);
        const fullProject = data.project;

        // Update the project in the projects array
        setProjects((prevProjects) =>
          prevProjects.map((p) =>
            p.id === projectId
              ? {
                  ...fullProject,
                  id: projectId,
                  isPhase1: false,
                }
              : p
          )
        );

        setLoadingProjects((prev) => ({ ...prev, [projectId]: 'completed' }));
        eventSource.close();
        // refresh saved projects after completion (no-op if user didn't save)
        fetchSavedProjects();
      });

      eventSource.addEventListener('error', (e) => {
        const data = JSON.parse(e.data);
        console.error(`Stream error for project ${projectId}:`, data.message);
        setLoadingProjects((prev) => ({ ...prev, [projectId]: 'error' }));
        eventSource.close();
      });

      // Handle connection errors
      eventSource.onerror = (error) => {
        console.error(`EventSource error for project ${projectId}:`, error);
        setLoadingProjects((prev) => ({ ...prev, [projectId]: 'error' }));
        eventSource.close();
      };
    } catch (error) {
      console.error(`Error setting up stream for project ${projectId}:`, error);
      // Fallback to polling if SSE fails
      pollProjectStatus(projectId);
    }
  };

    const saveProject = async (projectId) => {
      try {
        await axios.post(`${API_URL}/projects/${projectId}/save`);
        // Optimistically update savedProjects list (fetch latest)
        fetchSavedProjects();
        // toast success
        try { addToast && addToast('Saved project to your collection', 'success'); } catch(e) {}
      } catch (err) {
        console.error('Failed to save project:', err);
        try { addToast && addToast('Failed to save project', 'error'); } catch(e) {}
      }
    };

  // Handle project card expansion - fetch details if needed
  const handleProjectToggle = async (index) => {
    const project = projects[index];
    
    // Toggle expansion
    const willExpand = expandedProject !== index;
    setExpandedProject(willExpand ? index : null);
    
    // If expanding and project needs details, fetch them
    if (willExpand && project.id) {
      if (project.isPhase1 || project.status === 'generating') {
        // Start fetching/polling
        await fetchProjectDetails(project.id);
      } else if (!project.description && !project.materials?.length) {
        // No details yet, try to fetch
        await fetchProjectDetails(project.id);
      }
    }
  };

  const submitRankInline = async (projectId, value) => {
    try {
      await axios.post(`${API_URL}/projects/${projectId}/rank`, { value });
      try { addToast && addToast('Thanks for ranking', 'success'); } catch(e){}
      // update local projects array with refreshed rankScore and ranks
      const res = await axios.get(`${API_URL}/projects/${projectId}`);
      const updated = res.data.data?.project || res.data.project || null;
      if (updated) {
        setProjects((prev) => prev.map(p => (p.id === projectId ? { ...p, rankScore: updated.rankScore, ranks: updated.ranks } : p)));
      }
    } catch (err) {
      console.error('Failed to submit inline rank', err);
      try { addToast && addToast('Failed to submit ranking', 'error'); } catch(e){}
    }
  };

  if (loading) {
    return <div className="dashboard">Loading...</div>;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-container">
        <h1>Welcome, {user?.name}!</h1>
        <div className="dashboard-grid">
          <div className="dashboard-section">
            <h2>My Saved Projects</h2>
            {savedProjects.length > 0 ? (
              <div className="ideas-list">
                {savedProjects.map((proj) => (
                  <div key={proj._id || proj.id} className="idea-item">
                    <button onClick={() => openProjectModal(proj._id || proj.id)} className="link-like" style={{ textAlign: 'left', width: '100%', background: 'transparent', border: 'none', padding: 0 }}>
                      <h3>{proj.projectName || proj.title}</h3>
                      <p>{proj.description?.slice(0, 140)}</p>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p>No saved projects yet. Save a generated project to see it here.</p>
            )}
          </div>
          <div className="dashboard-section">
            <h2>My Posts</h2>
            {myPosts.length > 0 ? (
              <div className="posts-list">
                {myPosts.map((post) => (
                  <div key={post._id} className="post-item">
                    <button onClick={() => openPostModal(post._id)} className="link-like" style={{ textAlign: 'left', width: '100%', background: 'transparent', border: 'none', padding: 0 }}>
                      <h3>{post.title || post.projectName}</h3>
                      <p>{post.description}</p>
                    </button>
                    {post.imageUrl && (
                      <img src={post.imageUrl} alt={post.title} />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p>No posts yet. Share your upcycling projects!</p>
            )}
          </div>
          <div id='generate-section' className="dashboard-section">
            <h2>Generate DIY Projects</h2>
            <p>Describe the materials you have, and we&apos;ll suggest projects.</p>
            <div className="materials-input-group">
              <label htmlFor="materials" className="input-label">
                Materials you have
              </label>
              <textarea
                id="materials"
                className="materials-input"
                rows="3"
                value={materialsInput}
                onChange={(e) => setMaterialsInput(e.target.value)}
                placeholder="e.g., 3 mason jars, scrap wood, LED strip"
              />
              <div className="suggestions-row">
                {materialSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="suggestion-chip"
                    onClick={() => setMaterialsInput(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
              {recentPrompts.length > 0 && (
                <div>
                  <p className="eyebrow">Your recent prompts</p>
                  <div className="suggestions-row">
                    {recentPrompts.map((p) => (
                      <div key={p.id} style={{ display: 'inline-flex', alignItems: 'center', marginRight: '6px' }}>
                        <button
                          type="button"
                          className="suggestion-chip"
                          onClick={() => setMaterialsInput(p.prompt)}
                          style={{ maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        >
                          {p.prompt.length > 60 ? `${p.prompt.slice(0, 57)}...` : p.prompt}
                        </button>
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              await axios.delete(`${API_URL}/generate/history/${p.id}`);
                              // Remove locally for instant feedback
                              setRecentPrompts((prev) => prev.filter((r) => r.id !== p.id));
                            } catch (err) {
                              console.error('Failed to delete prompt:', err);
                            }
                          }}
                          className="suggestion-chip"
                          style={{ marginLeft: '4px', padding: '4px 8px', background: '#f5f5f5' }}
                          aria-label="Delete prompt"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="generate-actions">
              <p>
                We&apos;ll search existing DIY builds first, then ask the AI if we
                need more inspiration.
              </p>
              <button
                className="btn-generate"
                onClick={generateProjects}
                disabled={isGenerating}
              >
                {isGenerating ? 'Generating...' : 'Generate Projects'}
              </button>
            </div>
            {generateError && <p className="error-text">{generateError}</p>}
            {projects.length > 0 && (
              <section className="projects-list" aria-live="polite">
                <header className="projects-list__header">
                  <div>
                    <p className="eyebrow">Suggested builds</p>
                    <h3>{projects.length} project ideas</h3>
                  </div>
                  <small>
                    Tap a project to reveal detailed steps, tools, and warnings.
                  </small>
                </header>
                <div className="projects-grid">
                  {projects
                    .slice()
                    .sort((a, b) => (b.rankScore || 0) - (a.rankScore || 0))
                    .map((project, index) => (
                      <ProjectCard
                        key={project.id || project.projectName || index}
                        project={project}
                        isExpanded={expandedProject === index}
                        isLoading={loadingProjects[project.id] === 'loading'}
                        onToggle={() => handleProjectToggle(index)}
                        saveProject={saveProject}
                        importProject={handleImportToCreate}
                        user={user}
                        submitRankInline={submitRankInline}
                      />
                  ))}
                </div>
              </section>
            )}
            {!projects.length && !generateError && (
              <div className="empty-state">
                <h3>Need inspo?</h3>
                <p>
                  Describe the scraps, recyclables, or leftover craft pieces you
                  have on hand and we&apos;ll craft a step-by-step build plan.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      {selectedProjectId && (
        <ProjectModal projectId={selectedProjectId} onClose={closeProjectModal} />
      )}
      {selectedPostId && (
        <CommunityModal postId={selectedPostId} onClose={closePostModal} />
      )}
    </div>
  );
};

  const ProjectCard = ({ project, isExpanded, onToggle, isLoading, saveProject, importProject, user, submitRankInline }) => {
  const loadingState = isLoading && typeof isLoading === 'object' ? isLoading : { status: isLoading };
  const isGenerating = project.status === 'generating' || loadingState.status === 'loading' || loadingState.status === 'generating';
  const hasDetails = project.description || project.materials?.length || project.steps?.length;
  const progress = loadingState.progress || 0;
  const progressMessage = loadingState.message || 'Generating details...';
  const rankScore = project.rankScore || 0;
  const myVote = (user && project.ranks && Array.isArray(project.ranks))
    ? (project.ranks.find(r => r.userId === user._id || r.userId === user.id)?.value ?? null)
    : null;
  
  return (
    <article className={`project-card ${isExpanded ? 'expanded' : ''} ${isGenerating ? 'generating' : ''}`}>
      <header onClick={onToggle} className="project-card__header">
        <div>
          <p className="eyebrow">DIY Build</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h4 style={{ margin: 0 }}>{project.projectName || 'Loading...'}</h4>
            <span className="rank-badge" title={`Average rating: ${rankScore ? rankScore.toFixed(2) : '—'}`}>
              ★ {rankScore ? rankScore.toFixed(2) : '—'}
            </span>
            {myVote ? <small style={{ color: '#2a7d4f', fontWeight: 600 }}>You voted {myVote}</small> : null}
            {/* Inline quick-vote control visible on collapsed card */}
            {project.id && (
              <div className="inline-vote" style={{ display: 'inline-flex', gap: 6, marginLeft: 8 }} onClick={(e)=>e.stopPropagation()}>
                {[1,2,3,4,5].map(n => (
                  <button
                    key={`quick-${n}-${project.id}`}
                    className="vote-btn suggestion-chip"
                    onClick={(e) => { e.stopPropagation(); if (!project.id || project.status === 'generating') return; submitRankInline(project.id, n); }}
                    title={`Vote ${n}`}
                    aria-label={`Vote ${n}`}
                    disabled={project.status === 'generating'}
                    style={{ padding: '4px 8px', fontSize: 12 }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}
          </div>
          {isGenerating && (
            <div className="status-badge-container">
              <small className="status-badge">
                {progressMessage}
                {progress > 0 && <span className="progress-text"> ({Math.round(progress)}%)</span>}
              </small>
              {progress > 0 && (
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                </div>
              )}
            </div>
          )}
          {project.status === 'failed' && (
            <small className="status-badge error">Generation failed</small>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="toggle-details" disabled={project.status === 'failed'}>
            {isExpanded ? 'Hide details' : 'See details'}
          </button>
          {project.id && (
            <>
              <button
                type="button"
                className="suggestion-chip"
                onClick={(e) => {
                  e.stopPropagation();
                  if (importProject) importProject(project);
                }}
                style={{ padding: '6px 10px' }}
              >
                Import
              </button>
              <button
                type="button"
                className="suggestion-chip"
                onClick={(e) => {
                  e.stopPropagation();
                  if (saveProject) saveProject(project.id);
                }}
                style={{ padding: '6px 10px' }}
              >
                Save
              </button>
            </>
          )}
        </div>
      </header>
      {project.description ? (
        <p className="project-description">{project.description}</p>
      ) : isGenerating && isExpanded ? (
        <div className="generating-state">
          <p className="project-description">{progressMessage}</p>
          {progress > 0 && (
            <div className="progress-indicator">
              <div className="progress-bar-full">
                <div className="progress-fill-full" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          )}
        </div>
      ) : project.description === '' && !isGenerating ? (
        <p className="project-description">No description available.</p>
      ) : null}
      {project.materials && project.materials.length > 0 && (
        <div className="tags-row">
          {project.materials.slice(0, 4).map((material, idx) => (
            <span key={`${material.name}-${idx}`} className="tag">
              {typeof material === 'string' ? material : material.name}
            </span>
          ))}
        </div>
      )}
      {isExpanded && (
        <div className="project-details">
          {isGenerating && !hasDetails ? (
            <div className="loading-state">
              <p>⏳ Generating project details...</p>
              <p className="loading-hint">This may take a few moments. The AI is creating step-by-step instructions.</p>
            </div>
          ) : project.status === 'failed' ? (
            <div className="error-state">
              <p>❌ Project generation failed.</p>
              <p>Please try generating again or select a different project.</p>
            </div>
          ) : hasDetails ? (
            <>
              {project.materials && project.materials.length > 0 && (
                <section>
                  <h5>Materials</h5>
                  <ul>
                    {project.materials.map((material, idx) => (
                      <li key={`${material.name || material}-${idx}`}>
                        {typeof material === 'string'
                          ? material
                          : `${material.name || ''} ${material.quantity ? `— ${material.quantity}` : ''}`}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {project.steps && project.steps.length > 0 && (
                <section>
                  <h5>Build steps</h5>
                  <ol>
                    {project.steps.map((step, stepIdx) => (
                      <li key={`${step.title || stepIdx}-${stepIdx}`}>
                        {step.title && <strong>{step.title}</strong>}
                        {step.action && <span>{step.action}</span>}
                        {step.details && <em>{step.details}</em>}
                        {step.tools?.length ? (
                          <small>Tools: {step.tools.join(', ')}</small>
                        ) : null}
                        {step.warnings?.length ? (
                          <small className="warning">
                            Warnings: {step.warnings.join(', ')}
                          </small>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                </section>
              )}
              {project.referenceVideo && (
                <a
                  href={project.referenceVideo}
                  target="_blank"
                  rel="noreferrer"
                  className="reference-link"
                >
                  Watch reference video
                </a>
              )}
            </>
          ) : (
            <div className="empty-state">
              <p>No details available yet.</p>
            </div>
          )}
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: '#666' }}>Rate this idea</span>
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={(e) => { e.stopPropagation(); submitRankInline(project.id, n); }} className="suggestion-chip" style={{ padding: '6px 8px' }}>{n}</button>
              ))}
            </div>
          </div>
        </div>
      )}
    </article>
  );
};

export default Dashboard;

