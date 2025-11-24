import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Modal from './Modal';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const CommunityModal = ({ postId, onClose }) => {
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!postId) return;
    const fetchPost = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API_URL}/community/${postId}`);
        setPost(res.data.data?.post || res.data.post || null);
      } catch (err) {
        console.error('Failed to fetch post', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [postId]);

  return (
    <Modal title={post?.projectName || post?.title || 'Post'} onClose={onClose}>
      {loading ? (
        <div>Loading...</div>
      ) : !post ? (
        <div>Post not found</div>
      ) : (
        <div>
          <p style={{ color: '#444' }}>{post.description}</p>
          {post.materials?.length > 0 && (
            <section>
              <h4>Materials</h4>
              <ul>{post.materials.map((m, i) => <li key={i}>{typeof m === 'string' ? m : m.name}</li>)}</ul>
            </section>
          )}
          {post.steps?.length > 0 && (
            <section>
              <h4>Steps</h4>
              <ol>{post.steps.map((s, i) => <li key={i}><strong>{s.title}</strong><div>{s.action}</div></li>)}</ol>
            </section>
          )}
          {post.referenceVideo && (
            <div style={{ marginTop: 12 }}>
              <a href={post.referenceVideo} target="_blank" rel="noreferrer" className="reference-link">Watch reference video</a>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export default CommunityModal;
