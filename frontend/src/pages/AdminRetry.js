import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './Auth.css';
import './AdminRetry.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const AdminRetry = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [message, setMessage] = useState(null);

  const fetchFailed = async (p = 1) => {
    setLoading(true);
    try {
      const resp = await axios.get(`${API_URL}/generate/failed?page=${p}&limit=${limit}`);
      setProjects(resp.data.projects || []);
      setPage(resp.data.page || p);
      setTotal(resp.data.total || 0);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFailed(1);
  }, []);

  const retryProject = async (id, wait = false, idx = null) => {
    try {
      setMessage({ type: 'info', text: `Retrying ${id}...` });
      if (idx !== null) {
        // Optimistic UI change
        setProjects(prev => prev.map((p, i) => i === idx ? { ...p, status: 'generating' } : p));
      }
      const resp = await axios.post(`${API_URL}/generate/retry/${encodeURIComponent(id)}${wait ? '?wait=true' : ''}`);
      setMessage({ type: 'success', text: wait ? 'Generation completed' : 'Retry started' , data: resp.data });
      // Refresh list
      fetchFailed(page);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || err.message });
      // revert optimistic
      fetchFailed(page);
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h2>Admin — Failed Projects</h2>
        <div>
          <button onClick={() => fetchFailed(1)} className="btn-primary">Refresh</button>
        </div>
      </div>

      {message && <div className={`message ${message.type}`}><strong>{message.type}</strong>: {message.text}
        {message.data && <pre style={{ marginTop: 8, maxHeight: 200, overflow: 'auto' }}>{JSON.stringify(message.data, null, 2)}</pre>}
      </div>}

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="admin-table" style={{ width: '100%', marginTop: 12 }}>
          <thead>
            <tr>
              <th>Project Name</th>
              <th>Input Prompt</th>
              <th>Status</th>
              <th>Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.length === 0 ? (
              <tr><td colSpan={5}>No failed projects</td></tr>
            ) : projects.map((p, idx) => (
              <tr key={p._id}>
                <td>{p.projectName}</td>
                <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.inputPrompt || p.description || ''}</td>
                <td>{p.status}</td>
                <td>{new Date(p.updatedAt || p.createdAt).toLocaleString()}</td>
                <td>
                  <button onClick={() => retryProject(p._id, false, idx)} className="btn-primary">Retry</button>
                  <button onClick={() => retryProject(p._id, true, idx)} style={{ marginLeft: 8 }} className="btn-primary">Retry & Wait</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ marginTop: 12 }}>
        <button onClick={() => fetchFailed(Math.max(1, page - 1))} disabled={page <= 1}>Prev</button>
        <span style={{ margin: '0 12px' }}>{page} / {totalPages}</span>
        <button onClick={() => fetchFailed(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>Next</button>
      </div>
    </div>
  );
};

export default AdminRetry;
