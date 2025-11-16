import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaRecycle } from 'react-icons/fa';
import './CommunityInspiration.css';

const CommunityInspiration = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await axios.get(`${API_URL}/communityposts`);
      setPosts(response.data.data.posts);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Default posts if API fails or no data
  const defaultPosts = [
    {
      _id: '1',
      title: 'Cardboard Desk Organizer',
      description: 'A simple way to upcycle an old cardboard box.',
      material: 'Cardboard',
    },
    {
      _id: '2',
      title: 'DIY Bottle Planters',
      description: 'Transform plastic bottles into beautiful planters!',
      material: 'Plastic Bottles',
    },
    {
      _id: '3',
      title: 'Glass Jar Candle Holders',
      description: 'Make cozy and eco-friendly candle holders from old jars.',
      material: 'Glass Jars',
    },
    {
      _id: '4',
      title: 'T-Shirt Tote Bag',
      description: 'A simple, no-sew project to turn an old shirt into a bag.',
      material: 'Fabric',
    },
    {
      _id: '5',
      title: 'Tin Can Herb Garden',
      description: 'Give old tin cans a new purpose in your kitchen or garden.',
      material: 'Metal Cans',
    },
    {
      _id: '6',
      title: 'Denim Wallet',
      description: 'Repurpose old jeans into a stylish, custom wallet.',
      material: 'Fabric',
    },
  ];

  const displayPosts = posts.length > 0 ? posts : defaultPosts;

  if (loading) {
    return <div className="community-inspiration">Loading...</div>;
  }

  return (
    <div className="community-inspiration">
      <h2 className="section-title">Inspiration from Our Community</h2>
      <div className="inspiration-grid">
        {displayPosts.slice(0, 6).map((post) => (
          <div key={post._id} className="inspiration-card">
            <div className="card-icon">
              <FaRecycle />
            </div>
            <div className="card-content">
              <h3 className="card-title-small">{post.title}</h3>
              <p className="card-description-small">{post.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CommunityInspiration;

