import React from 'react';

function DashboardPage({ backendHealth, error, onRefreshHealth }) {
  return (
    <div>
      <div className="card">
        <h2 className="card-title">Phase 1: Project Foundation Status</h2>
        <p className="card-desc">
          Unified software platform foundation for the City-Wide Vehicle Intelligence & Investigation System (SIH 2026).
        </p>

        <div className="grid-4">
          <div className="stat-box">
            <div className="stat-label">Frontend Stack</div>
            <div className="stat-value">React 18 (JS)</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Backend Stack</div>
            <div className="stat-value">Node.js / Express</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">API Health</div>
            <div className="stat-value" style={{ color: backendHealth?.status === 'ok' ? 'var(--accent-green)' : 'var(--accent-amber)' }}>
              {backendHealth?.status === 'ok' ? 'Online' : 'Checking...'}
            </div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Database Mode</div>
            <div className="stat-value" style={{ fontSize: '1rem', marginTop: '0.4rem' }}>
              {backendHealth?.database?.status === 'connected' ? 'MongoDB Connected' : 'Initial Dev / Standalone'}
            </div>
          </div>
        </div>

        {error && (
          <div className="list-item" style={{ borderColor: 'var(--accent-amber)', color: 'var(--accent-amber)' }}>
            <span>Backend Connection Note: {error}</span>
            <button
              onClick={onRefreshHealth}
              style={{
                background: 'var(--bg-hover)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                padding: '0.3rem 0.6rem',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Retry
            </button>
          </div>
        )}
      </div>

      <div className="grid-2">
        <div className="card">
          <h3 className="card-title">System Health Response</h3>
          <p className="card-desc">Live response from <code>GET /api/health</code></p>
          <pre
            style={{
              backgroundColor: 'var(--bg-card)',
              padding: '1rem',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              color: 'var(--accent-blue)',
              fontSize: '0.85rem',
              overflowX: 'auto'
            }}
          >
            {backendHealth ? JSON.stringify(backendHealth, null, 2) : '// Loading backend health data...'}
          </pre>
        </div>

        <div className="card">
          <h3 className="card-title">Mandatory SIH 2026 Core Modules</h3>
          <p className="card-desc">Scheduled implementation roadmap</p>
          
          <div className="list-item">
            <span>1. High-Precision OCR / ANPR Module</span>
            <span className="badge badge-gray">Phase 5</span>
          </div>
          <div className="list-item">
            <span>2. Multi-Camera Trajectory Engine</span>
            <span className="badge badge-gray">Phase 7</span>
          </div>
          <div className="list-item">
            <span>3. GIS Map & Visualization (Leaflet)</span>
            <span className="badge badge-gray">Phase 8</span>
          </div>
          <div className="list-item">
            <span>4. City Traffic Analytics (Recharts)</span>
            <span className="badge badge-gray">Phase 9</span>
          </div>
          <div className="list-item">
            <span>5. Real-Time Alert Engine</span>
            <span className="badge badge-gray">Phase 10</span>
          </div>
          <div className="list-item">
            <span>6. Human-in-the-Loop Investigation Hub</span>
            <span className="badge badge-gray">Phase 11</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;

