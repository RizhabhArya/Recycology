import React from 'react';
import { useNavigate } from 'react-router-dom';
import './GarbageCollectorFinder.css';

const GarbageCollectorFinder = () => {
  const navigate = useNavigate();

  const handleFindCollector = () => {
    // Navigate to collector search page or show modal
    alert('Collector finder feature coming soon!');
  };

  return (
    <div className="garbage-collector-finder">
      <h3 className="card-title">Find a Garbage Collector</h3>
      <p className="card-description">
        Locate nearby waste collection services for proper disposal.
      </p>
      <button className="btn-card" onClick={handleFindCollector}>
        Find Collector
      </button>
    </div>
  );
};

export default GarbageCollectorFinder;

