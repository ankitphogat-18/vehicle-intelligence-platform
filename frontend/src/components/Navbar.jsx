import React from 'react';

function Navbar({ backendHealth }) {
  const isHealthy = backendHealth && backendHealth.status === 'ok';

  return (
    <header className="header">
      <div className="header-title">
        City-Wide Vehicle Intelligence & Investigation Command Platform
      </div>
      <div className="status-pill">
        <span className={`status-dot ${isHealthy ? 'online' : 'offline'}`}></span>
        <span>
          Backend API: {isHealthy ? 'Operational' : 'Checking...'}
        </span>
      </div>
    </header>
  );
}

export default Navbar;

