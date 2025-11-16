import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const [savedIdeas, setSavedIdeas] = useState([]);
  const [myPosts, setMyPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

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
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

