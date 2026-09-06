import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import DashboardPage from './pages/DashboardPage';
import CameraNetworkPage from './pages/CameraNetworkPage';
import PlaceholderPage from './pages/PlaceholderPage';

function App() {
  const [backendHealth, setBackendHealth] = useState(null);
  const [error, setError] = useState(null);

  const fetchHealth = async () => {
    try {
      const response = await fetch('/api/health');
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      const data = await response.json();
      setBackendHealth(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch backend health:', err);
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchHealth();
    // Poll backend health every 10 seconds
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-wrapper">
        <Navbar backendHealth={backendHealth} />
        <main className="content-area">
          <Routes>
            <Route
              path="/"
              element={
                <DashboardPage
                  backendHealth={backendHealth}
                  error={error}
                  onRefreshHealth={fetchHealth}
                />
              }
            />
            <Route
              path="/cameras"
              element={<CameraNetworkPage />}
            />
            <Route
              path="/anpr"
              element={
                <PlaceholderPage
                  title="High-Precision OCR / ANPR Studio"
                  phase="Phase 5"
                  description="Image/frame ingestion, plate character recognition, confidence scoring, and multi-lane extraction."
                />
              }
            />
            <Route
              path="/trajectories"
              element={
                <PlaceholderPage
                  title="Vehicle Trajectory Reconstruction"
                  phase="Phase 7"
                  description="Spatio-temporal trajectory reconstruction, multi-camera sighting timeline, and average velocity estimation."
                />
              }
            />
            <Route
              path="/map"
              element={
                <PlaceholderPage
                  title="GIS Command Map (Leaflet / OSM)"
                  phase="Phase 8"
                  description="Interactive city-wide GIS map plotting cameras, detections, trajectories, and geofenced zones."
                />
              }
            />
            <Route
              path="/analytics"
              element={
                <PlaceholderPage
                  title="City Traffic Analytics Dashboard"
                  phase="Phase 9"
                  description="Traffic heatmaps, vehicle density trends, peak-hour distributions, and congestion detection (Recharts)."
                />
              }
            />
            <Route
              path="/alerts"
              element={
                <PlaceholderPage
                  title="Real-Time Alert Center"
                  phase="Phase 10"
                  description="Automated alert triggers for stolen vehicles, watchlists, possible plate cloning, and trajectory anomalies."
                />
              }
            />
            <Route
              path="/investigation"
              element={
                <PlaceholderPage
                  title="Investigation & Human Verification Hub"
                  phase="Phase 11"
                  description="Human-in-the-loop evidence review, case management, audit trails, and false-positive resolution."
                />
              }
            />
            <Route
              path="*"
              element={
                <div className="card">
                  <h2 className="card-title">404 - Page Not Found</h2>
                  <p className="card-desc">The requested route does not exist.</p>
                </div>
              }
            />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;

