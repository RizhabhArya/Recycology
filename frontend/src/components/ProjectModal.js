import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Modal from './Modal';
import { useAuth } from '../context/AuthContext';
import { useToast } from './ToastContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ProjectModal = ({ projectId, onClose }) => {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [myVote, setMyVote] = useState(null);
  const { user } = useAuth();
  const { addToast } = useToast();

  useEffect(() => {
    if (!projectId) return;
    const fetchProject = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API_URL}/projects/${projectId}`);
        const p = res.data.data?.project || res.data.project || null;
        setProject(p);
        if (p?.ranks && user) {
          const vote = p.ranks.find(r => r.userId === user._id || r.userId === user.id);
          if (vote) setMyVote(vote.value);
        }
      } catch (err) {
        console.error('Failed to load project', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProject();
  }, [projectId, user]);

  const submitRank = async (value) => {
    if (!projectId) return;
    try {
      await axios.post(`${API_URL}/projects/${projectId}/rank`, { value });
      addToast('Thanks for ranking', 'success');
      setMyVote(value);
      // refresh project
      const res = await axios.get(`${API_URL}/projects/${projectId}`);
      setProject(res.data.data?.project || res.data.project || null);
    } catch (err) {
      console.error('Failed to rank', err);
      addToast('Failed to submit ranking', 'error');
    }
  };

  return (
    <Modal title={project?.projectName || 'Project details'} onClose={onClose}>
      {loading ? (
        <div>Loading...</div>
      ) : !project ? (
        <div>Project not found</div>
      ) : (
        <div>
          <p style={{ color: '#444' }}>{project.description}</p>

          {project.materials && project.materials.length > 0 && (
            <section>
              <h4>Materials</h4>
              <ul>
                {project.materials.map((m, i) => (
                  <li key={i}>{typeof m === 'string' ? m : m.name}</li>
                ))}
              </ul>
            </section>
          )}

          {project.steps && project.steps.length > 0 && (
            <section>
              <h4>Steps</h4>
              <ol>
                {project.steps.map((s, i) => (
                  <li key={i} style={{ marginBottom: 8 }}>
                    <strong>{s.title}</strong>
                    <div>{s.action}</div>
                    {s.details && <div><em>{s.details}</em></div>}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {project.referenceVideo && (
            <div style={{ marginTop: 12 }}>
              <a href={project.referenceVideo} target="_blank" rel="noreferrer" className="reference-link">Watch reference video</a>
            </div>
          )}

          <section style={{ marginTop: 14 }}>
            <h4>Ranking</h4>
            <p>Current score: {project.rankScore ? project.rankScore.toFixed(2) : '0.00'}</p>
            {myVote ? (
              <p style={{ color: '#2a7d4f', fontWeight: 600 }}>You voted {myVote}</p>
            ) : null}
            <div style={{ display: 'flex', gap: 8 }}>
              {[1,2,3,4,5].map((n) => (
                <button key={n} onClick={() => submitRank(n)} className="suggestion-chip">{n}</button>
              ))}
            </div>
          </section>
        </div>
      )}
    </Modal>
  );
};

export default ProjectModal;
