import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const [savedIdeas, setSavedIdeas] = useState([]);
  const [myPosts, setMyPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [materialsInput, setMaterialsInput] = useState('');
  const [projects, setProjects] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [expandedProject, setExpandedProject] = useState(null);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const materialSuggestions = [
    '3 mason jars, twine, tea lights',
    'Scrap pallet wood, nails, chalk paint',
    'Plastic bottles, rope, LED strip lights',
    'Old denim jeans, buttons, elastic bands',
  ];

  useEffect(() => {
    fetchUserData();
  }, []);

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
      setProjects(response.data.projects || []);
    } catch (error) {
      const message =
        error.response?.data?.error || 'Failed to generate DIY projects';
      setGenerateError(message);
    } finally {
      setIsGenerating(false);
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
            <h2>My Saved Ideas</h2>
            {savedIdeas.length > 0 ? (
              <div className="ideas-list">
                {savedIdeas.map((idea) => (
                  <div key={idea._id} className="idea-item">
                    <h3>{idea.material}</h3>
                    <p>{idea.idea}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p>No saved ideas yet. Start generating ideas!</p>
            )}
          </div>
          <div className="dashboard-section">
            <h2>My Posts</h2>
            {myPosts.length > 0 ? (
              <div className="posts-list">
                {myPosts.map((post) => (
                  <div key={post._id} className="post-item">
                    <h3>{post.title}</h3>
                    <p>{post.description}</p>
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
                  {projects.map((project, index) => (
                    <ProjectCard
                      key={project.projectName || index}
                      project={project}
                      isExpanded={expandedProject === index}
                      onToggle={() =>
                        setExpandedProject(
                          expandedProject === index ? null : index
                        )
                      }
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
    </div>
  );
};

const ProjectCard = ({ project, isExpanded, onToggle }) => (
  <article className={`project-card ${isExpanded ? 'expanded' : ''}`}>
    <header onClick={onToggle} className="project-card__header">
      <div>
        <p className="eyebrow">DIY Build</p>
        <h4>{project.projectName}</h4>
      </div>
      <button type="button" className="toggle-details">
        {isExpanded ? 'Hide details' : 'See details'}
      </button>
    </header>
    <p className="project-description">{project.description}</p>
    <div className="tags-row">
      {project.materials?.slice(0, 4).map((material, idx) => (
        <span key={`${material.name}-${idx}`} className="tag">
          {material.name}
        </span>
      ))}
    </div>
    {isExpanded && (
      <div className="project-details">
        <section>
          <h5>Materials</h5>
          <ul>
            {project.materials?.map((material, idx) => (
              <li key={`${material.name}-${idx}`}>
                {material.name} — {material.quantity}
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h5>Build steps</h5>
          <ol>
            {project.steps?.map((step, stepIdx) => (
              <li key={`${step.title}-${stepIdx}`}>
                <strong>{step.title}</strong>
                <span>{step.action}</span>
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
      </div>
    )}
  </article>
);

export default Dashboard;

