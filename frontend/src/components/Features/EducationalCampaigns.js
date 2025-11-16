import React from 'react';
import './EducationalCampaigns.css';

const EducationalCampaigns = () => {
  const handleLearnMore = () => {
    alert('Educational campaigns feature coming soon!');
  };

  return (
    <div className="educational-campaigns">
      <h3 className="card-title">Educational Campaigns</h3>
      <p className="card-description">
        Discover our workshops and campaigns for a greener community.
      </p>
      <button className="btn-card" onClick={handleLearnMore}>
        Learn More
      </button>
    </div>
  );
};

export default EducationalCampaigns;

