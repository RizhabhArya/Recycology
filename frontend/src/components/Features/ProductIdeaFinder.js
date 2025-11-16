import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import './ProductIdeaFinder.css';

const ProductIdeaFinder = () => {
  const [selectedMaterial, setSelectedMaterial] = useState('Plastic Bottles');
  const [idea, setIdea] = useState(null);
  const [loading, setLoading] = useState(false);
  const { isAuthenticated } = useAuth();

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  const materials = [
    'Plastic Bottles',
    'Cardboard',
    'Glass Jars',
    'Fabric',
    'Metal Cans',
    'Wood',
  ];

  const handleGetIdeas = async () => {
    if (!isAuthenticated) {
      alert('Please login to generate ideas');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/ideas/generate`,
        { material: selectedMaterial }
      );
      setIdea(response.data.data.idea);
    } catch (error) {
      console.error('Error generating idea:', error);
      alert(error.response?.data?.message || 'Failed to generate idea');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="product-idea-finder">
      <h2 className="section-title">Find a New Product Idea</h2>
      <div className="idea-input-section">
        <select
          className="material-select"
          value={selectedMaterial}
          onChange={(e) => setSelectedMaterial(e.target.value)}
        >
          {materials.map((material) => (
            <option key={material} value={material}>
              {material}
            </option>
          ))}
        </select>
        <button
          className="btn-get-ideas"
          onClick={handleGetIdeas}
          disabled={loading}
        >
          {loading ? 'Generating...' : 'Get Ideas'}
        </button>
      </div>
      {idea && (
        <div className="idea-card">
          <p className="idea-text">{idea.idea}</p>
          <p className="idea-hint">
            Liked this idea? You could upload a video of your project to inspire
            others!
          </p>
        </div>
      )}
    </div>
  );
};

export default ProductIdeaFinder;

