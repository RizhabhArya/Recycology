import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastContext';
import './CreatePost.css';

const CreatePost = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const { addToast } = useToast();

  const [projectName, setProjectName] = useState('');
  const [inputPrompt, setInputPrompt] = useState('');
  const [description, setDescription] = useState('');
  const [referenceVideo, setReferenceVideo] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState('');
  const [materials, setMaterials] = useState([{ name: '' }]);
  const [steps, setSteps] = useState([{ title: '', action: '', details: '' }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [importJson, setImportJson] = useState('');
  const [importError, setImportError] = useState('');

  const handleMaterialChange = (idx, val) => {
    const next = [...materials];
    next[idx].name = val;
    setMaterials(next);
  };
  const addMaterial = () => setMaterials((s) => [...s, { name: '' }]);
  const removeMaterial = (idx) => setMaterials((s) => s.filter((_, i) => i !== idx));

  const handleStepChange = (idx, field, val) => {
    const next = [...steps];
    next[idx][field] = val;
    setSteps(next);
  };
  const addStep = () => setSteps((s) => [...s, { title: '', action: '', details: '' }]);
  const removeStep = (idx) => setSteps((s) => s.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!projectName.trim() || !description.trim()) {
      setError('Project name and description are required');
      return;
    }

    setSubmitting(true);
    try {
      let res;
      // If user selected a file, send multipart/form-data
      if (thumbnailFile) {
        const form = new FormData();
        form.append('file', thumbnailFile);
        form.append('projectName', projectName.trim());
        form.append('description', description.trim());
        form.append('inputPrompt', inputPrompt.trim());
        if (referenceVideo) form.append('videoUrl', referenceVideo.trim());
        // send materials & steps as JSON strings so backend can parse
        form.append('materials', JSON.stringify(materials.filter((m) => m.name && m.name.trim())));
        form.append('steps', JSON.stringify(steps.filter((s) => s.title || s.action || s.details)));

        res = await axios.post(`${API_URL}/community`, form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        const payload = {
          projectName: projectName.trim(),
          description: description.trim(),
          referenceVideo: referenceVideo?.trim(),
          thumbnailUrl: thumbnailUrl?.trim(),
          materials: materials.filter((m) => m.name && m.name.trim()),
          steps: steps.filter((s) => s.title || s.action || s.details),
          inputPrompt: inputPrompt.trim(),
        };

        res = await axios.post(`${API_URL}/community`, payload);
      }
      // show success toast and redirect after short delay
      try { addToast && addToast('Posted to community', 'success'); } catch (e) {}
      setTimeout(() => navigate('/dashboard'), 900);
    } catch (err) {
      console.error('Failed to create post', err);
      try { addToast && addToast('Failed to post', 'error'); } catch (e) {}
      setError(err.response?.data?.message || 'Failed to create post');
    } finally {
      setSubmitting(false);
    }
  };

  const handleImport = () => {
    setImportError('');
    if (!importJson.trim()) {
      setImportError('Paste AI output JSON or a project object here');
      return;
    }
    try {
      const obj = JSON.parse(importJson);
      // support wrapper { project: {...} } or direct object
      const data = obj.project || obj;
      if (data.projectName || data.title) setProjectName(data.projectName || data.title || '');
      if (data.inputPrompt) setInputPrompt(data.inputPrompt);
      if (data.description) setDescription(data.description);
      if (data.referenceVideo) setReferenceVideo(data.referenceVideo);
      if (data.thumbnailUrl) setThumbnailUrl(data.thumbnailUrl);
      if (Array.isArray(data.materials)) setMaterials(data.materials.map((m) => (typeof m === 'string' ? { name: m } : { name: m.name || '' })));
      if (Array.isArray(data.steps)) setSteps(data.steps.map((s) => ({ title: s.title || '', action: s.action || '', details: s.details || '' })));
      if (data.thumbnailUrl) setThumbnailUrl(data.thumbnailUrl);
    } catch (err) {
      setImportError('Invalid JSON — please paste valid JSON from the AI result');
    }
  };

  // Prefill when navigated with state (import from ProjectCard)
  useEffect(() => {
    if (location?.state?.project) {
      const data = location.state.project;
      if (data.projectName || data.projectName === '') setProjectName(data.projectName || data.title || '');
      if (data.inputPrompt) setInputPrompt(data.inputPrompt);
      if (data.description) setDescription(data.description);
      if (data.referenceVideo) setReferenceVideo(data.referenceVideo);
      if (data.thumbnailUrl) setThumbnailUrl(data.thumbnailUrl || '');
      if (Array.isArray(data.materials)) setMaterials(data.materials.map((m) => (typeof m === 'string' ? { name: m } : { name: m.name || '' })));
      if (Array.isArray(data.steps)) setSteps(data.steps.map((s) => ({ title: s.title || '', action: s.action || '', details: s.details || '' })));
      if (data.thumbnailUrl) setThumbnailUrl(data.thumbnailUrl || '');
    }
  }, [location]);

  const [showImport, setShowImport] = useState(false);

  const youtubeEmbed = (url) => {
    if (!url) return null;
    try {
      const u = new URL(url);
      // support youtube short youtu.be and watch?v=
      if (u.hostname.includes('youtu.be')) {
        const id = u.pathname.slice(1);
        return `https://www.youtube.com/embed/${id}`;
      }
      if (u.hostname.includes('youtube.com')) {
        const p = u.searchParams.get('v');
        if (p) return `https://www.youtube.com/embed/${p}`;
      }
    } catch (e) {
      return null;
    }
    return null;
  };

  // Handle selected thumbnail file and create preview URL
  useEffect(() => {
    if (!thumbnailFile) {
      setThumbnailPreview('');
      return;
    }
    const url = URL.createObjectURL(thumbnailFile);
    setThumbnailPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [thumbnailFile]);

  const handleThumbnailSelect = (file) => {
    if (!file) {
      setThumbnailFile(null);
      return;
    }
    setThumbnailFile(file);
    setThumbnailUrl('');
  };

  return (
    <div className="dashboard">
      <div className="dashboard-container">
        <h1>Contribute to Community</h1>
        <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
          <form className="create-post-form create-panel" onSubmit={handleSubmit} style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0 }}>Create Post</h2>
              <div>
                <button type="button" className="suggestion-chip" onClick={() => setShowImport(s => !s)}>{showImport ? 'Hide import' : 'Import AI JSON'}</button>
              </div>
            </div>

            {showImport && (
              <div className="import-area">
                <label style={{ fontWeight: 600 }}>Paste AI result JSON</label>
                <textarea
                  value={importJson}
                  onChange={(e) => setImportJson(e.target.value)}
                  placeholder='Paste AI JSON here (e.g. {"projectName":"Lamp","description":"...","materials":["jar"],"steps":[...]})'
                  rows={4}
                  style={{ width: '100%', marginTop: 6 }}
                />
                <div style={{ marginTop: 6 }}>
                  <button type="button" className="btn-generate" onClick={handleImport}>Import</button>
                  {importError && <span style={{ color: 'crimson', marginLeft: 8 }}>{importError}</span>}
                </div>
              </div>
            )}

            <label>Project name</label>
            <input value={projectName} onChange={(e) => setProjectName(e.target.value)} />

            <label>Prompt (optional)</label>
            <textarea value={inputPrompt} onChange={(e) => setInputPrompt(e.target.value)} />

            <label>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} />

            <label>YouTube reference video (optional)</label>
            <input value={referenceVideo} onChange={(e) => setReferenceVideo(e.target.value)} placeholder="https://youtube.com/your-video" />

            <label>Thumbnail image (upload or paste URL)</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleThumbnailSelect(e.target.files && e.target.files[0])}
              />
              <span style={{ color: '#6b7280' }}>or</span>
              <input
                value={thumbnailUrl}
                onChange={(e) => { setThumbnailUrl(e.target.value); setThumbnailFile(null); }}
                placeholder="https://.../image.jpg"
                style={{ flex: 1 }}
              />
            </div>

            <label>Materials</label>
            {materials.map((m, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input value={m.name} onChange={(e) => handleMaterialChange(idx, e.target.value)} placeholder="e.g., 3 mason jars" />
                <button type="button" onClick={() => removeMaterial(idx)}>Remove</button>
              </div>
            ))}
            <button type="button" onClick={addMaterial}>Add material</button>

            <label>Steps</label>
            {steps.map((s, idx) => (
              <div key={idx} className="step-row">
                <input placeholder="Step title" value={s.title} onChange={(e) => handleStepChange(idx, 'title', e.target.value)} />
                <input placeholder="Action" value={s.action} onChange={(e) => handleStepChange(idx, 'action', e.target.value)} />
                <textarea placeholder="Details (optional)" value={s.details} onChange={(e) => handleStepChange(idx, 'details', e.target.value)} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={() => removeStep(idx)}>Remove step</button>
                </div>
              </div>
            ))}
            <button type="button" onClick={addStep}>Add step</button>

            <div className="create-actions" style={{ marginTop: 12 }}>
              <button className="btn-generate" type="submit" disabled={submitting}>{submitting ? 'Posting...' : 'Post to Community'}</button>
              {error && <p className="error-text">{error}</p>}
              {success && <p style={{ color: 'green' }}>{success}</p>}
            </div>
          </form>

          <aside className="create-preview" style={{ width: 360 }}>
            <div className="create-post-panel">
              <h3 className="preview-title">{projectName || 'Preview title'}</h3>
              <div className="preview-subtitle">{inputPrompt ? `Prompt: ${inputPrompt}` : ''}</div>

              <div className="preview-thumbnail">
                {thumbnailPreview ? (
                  <img src={thumbnailPreview} alt="thumbnail" />
                ) : thumbnailUrl ? (
                  <img src={thumbnailUrl} alt="thumbnail" onError={(e) => { e.target.style.display = 'none'; }} />
                ) : (
                  <div style={{ color: '#9ca3af', fontSize: 14 }}>No thumbnail</div>
                )}
              </div>

              <p className="preview-description">{description || 'Preview description'}</p>

              {materials && materials.length > 0 && (
                <section className="preview-section">
                  <h4>Materials</h4>
                  <div className="preview-tags">
                    {materials.filter(m => m.name).map((m, i) => (<span className="preview-tag" key={i}>{m.name}</span>))}
                  </div>
                </section>
              )}

              {steps && steps.length > 0 && (
                <section className="preview-section">
                  <h4>Steps</h4>
                  <div className="preview-steps">
                    {steps.filter(s => s.title || s.action || s.details).map((s, i) => (
                      <div className="preview-step" key={i}>
                        <div className="step-number" />
                        <div className="step-text">
                          {s.title && <div style={{ fontWeight: 700 }}>{s.title}</div>}
                          {s.action && <div style={{ color: '#4b5563' }}>{s.action}</div>}
                          {s.details && <div style={{ fontStyle: 'italic', color: '#6b7280' }}>{s.details}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {referenceVideo && youtubeEmbed(referenceVideo) ? (
                <div className="preview-embed">
                  <iframe title="ref-video" src={youtubeEmbed(referenceVideo)} frameBorder="0" allowFullScreen />
                </div>
              ) : referenceVideo ? (
                <div style={{ marginTop: 8 }}><a href={referenceVideo} target="_blank" rel="noreferrer">Open reference video</a></div>
              ) : null}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default CreatePost;
