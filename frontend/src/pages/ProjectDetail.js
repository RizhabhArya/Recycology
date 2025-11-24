import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { useToast } from '../components/ToastContext';
import { useAuth } from '../context/AuthContext';

const ProjectDetail = () => {
  const { id } = useParams();
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const { user } = useAuth();
  const [myVote, setMyVote] = useState(null);
  const { addToast } = useToast();

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const res = await axios.get(`${API_URL}/projects/${id}`);
        setProject(res.data.data.project || res.data.project || null);
      } catch (err) {
        console.error('Failed to load project', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProject();
  }, [id]);

  useEffect(() => {
    if (!project || !user) return;
    if (project.ranks && Array.isArray(project.ranks)) {
      const vote = project.ranks.find(r => r.userId === user._id || r.userId === user.id);
      if (vote) setMyVote(vote.value);
    }
  }, [project, user]);

  const submitRank = async (value) => {
    try {
      await axios.post(`${API_URL}/projects/${id}/rank`, { value });
      addToast('Thanks for ranking', 'success');
      setRating(value);
      // refresh project
      const res = await axios.get(`${API_URL}/projects/${id}`);
      setProject(res.data.data.project || res.data.project || null);
    } catch (err) {
      console.error('Failed to rank', err);
      addToast('Failed to submit ranking', 'error');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!project) return <div>Project not found</div>;

  return (
    <div className="dashboard-container">
      <h2>{project.projectName || project.title}</h2>
      <p>{project.description}</p>

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
              <li key={i}>
                <strong>{s.title}</strong>
                <div>{s.action}</div>
                {s.details && <div><em>{s.details}</em></div>}
              </li>
            ))}
          </ol>
        </section>
      )}

      <section>
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
  );
};

export default ProjectDetail;
