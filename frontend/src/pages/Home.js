import React from 'react';
import ProductIdeaFinder from '../components/Features/ProductIdeaFinder';
import GarbageCollectorFinder from '../components/Features/GarbageCollectorFinder';
import EducationalCampaigns from '../components/Features/EducationalCampaigns';
import CommunityInspiration from '../components/Features/CommunityInspiration';
import './Home.css';

const Home = () => {
  return (
    <div className="home">
      <div className="home-container">
        <div className="main-content">
          <ProductIdeaFinder />
        </div>
        <div className="side-content">
          <GarbageCollectorFinder />
          <EducationalCampaigns />
        </div>
      </div>
      <CommunityInspiration />
    </div>
  );
};

export default Home;

