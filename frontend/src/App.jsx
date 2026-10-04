import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import DashboardPage from './pages/DashboardPage';
import CameraNetworkPage from './pages/CameraNetworkPage';
import ANPRStudioPage from './pages/ANPRStudioPage';
import VehicleSearchPage from './pages/VehicleSearchPage';
import MapPage from './pages/MapPage';
import AlertsPage from './pages/AlertsPage';
import TrafficAnalyticsPage from './pages/TrafficAnalyticsPage';
import InvestigationHubPage from './pages/InvestigationHubPage';
import Login from './pages/Login';
import CitizenDashboard from './pages/CitizenDashboard';
import PoliceVerificationQueue from './pages/PoliceVerificationQueue';
import IncidentManagementDashboard from './pages/IncidentManagementDashboard';
import PoliceCameraConsole from './pages/PoliceCameraConsole';

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [backendHealth, setBackendHealth] = useState(null);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const fetchHealth = async () => {
    try {
      const response = await fetch('/api/health');
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
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
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleAuthSuccess = (authenticatedUser) => {
    setUser(authenticatedUser);
    if (authenticatedUser.role === 'CITIZEN') {
      navigate('/citizen');
    } else if (authenticatedUser.role === 'INCIDENT_MANAGEMENT') {
      navigate('/incidents');
    } else {
      navigate('/');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  };

  // 1. Unauthenticated View (Full-screen clean login/register, no sidebar)
  if (!user) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <Routes>
          <Route path="/login" element={<Login onAuthSuccess={handleAuthSuccess} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    );
  }

  // 2. Authenticated View (Sidebar + Main layout with role-filtered views)
  return (
    <div className="app-layout">
      <Sidebar user={user} />
      <div className="main-wrapper">
        <Navbar user={user} onLogout={handleLogout} backendHealth={backendHealth} />
        <main className="content-area">
          <Routes>
            {/* Citizen Routes */}
            {user.role === 'CITIZEN' && (
              <>
                <Route path="/" element={<Navigate to="/citizen" replace />} />
                <Route path="/citizen" element={<CitizenDashboard initialTab="list" />} />
                <Route path="/citizen/register" element={<CitizenDashboard initialTab="register" />} />
                <Route path="*" element={<Navigate to="/citizen" replace />} />
              </>
            )}

            {/* Police Routes */}
            {user.role === 'POLICE' && (
              <>
                <Route path="/" element={<DashboardPage backendHealth={backendHealth} error={error} onRefreshHealth={fetchHealth} />} />
                <Route path="/cameras" element={<PoliceCameraConsole />} />
                <Route path="/police/cameras" element={<PoliceCameraConsole />} />
                <Route path="/police/verifications" element={<PoliceVerificationQueue />} />
                <Route path="/anpr" element={<ANPRStudioPage />} />
                <Route path="/trajectories" element={<VehicleSearchPage />} />
                <Route path="/map" element={<MapPage />} />
                <Route path="/map/:plate" element={<MapPage />} />
                <Route path="/alerts" element={<AlertsPage />} />
                <Route path="/investigation" element={<InvestigationHubPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </>
            )}

            {/* Incident Management Routes */}
            {user.role === 'INCIDENT_MANAGEMENT' && (
              <>
                <Route path="/" element={<Navigate to="/incidents" replace />} />
                <Route path="/incidents" element={<IncidentManagementDashboard initialTab="feed" />} />
                <Route path="/report-incident" element={<IncidentManagementDashboard initialTab="report" />} />
                <Route path="/map" element={<MapPage />} />
                <Route path="/map/:plate" element={<MapPage />} />
                <Route path="/analytics" element={<TrafficAnalyticsPage />} />
                <Route path="*" element={<Navigate to="/incidents" replace />} />
              </>
            )}
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
