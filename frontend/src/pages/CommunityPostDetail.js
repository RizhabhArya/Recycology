import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';

const CommunityPostDetail = () => {
  const { id } = useParams();
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const res = await axios.get(`${API_URL}/community/${id}`);
        setPost(res.data.data.post || res.data.post || null);
      } catch (err) {
        console.error('Failed to load post', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [id]);

  if (loading) return <div>Loading...</div>;
  if (!post) return <div>Post not found</div>;

  return (
    <div className="dashboard-container">
      <h2>{post.projectName || post.title}</h2>
      <p>{post.description}</p>
      {post.materials && post.materials.length > 0 && (
        <section>
          <h4>Materials</h4>
          <ul>
            {post.materials.map((m, i) => <li key={i}>{typeof m === 'string' ? m : m.name}</li>)}
          </ul>
        </section>
      )}
      {post.steps && post.steps.length > 0 && (
        <section>
          <h4>Steps</h4>
          <ol>
            {post.steps.map((s, i) => (
              <li key={i}>
                <strong>{s.title}</strong>
                <div>{s.action}</div>
                {s.details && <div><em>{s.details}</em></div>}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
};

export default CommunityPostDetail;
