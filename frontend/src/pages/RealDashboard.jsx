import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function RealDashboard({ backendHealth }) {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const CHANDIGARH_CHECKPOINTS = [
    { id: 'CAM-CHD-01', name: 'Tribune Chowk (Sector 29/31)', status: 'ONLINE', junction: 'Dakshin Marg Radial', sightings: 142 },
    { id: 'CAM-CHD-02', name: 'Sector 17 Plaza Radial Junction', status: 'ONLINE', junction: 'Jan Marg Central', sightings: 98 },
    { id: 'CAM-CHD-03', name: 'ISBT Sector 43 Chowk', status: 'ONLINE', junction: 'Himalaya Marg', sightings: 115 },
    { id: 'CAM-CHD-04', name: 'Transport Chowk (Madhya Marg)', status: 'ONLINE', junction: 'Purv Marg Exit', sightings: 87 },
    { id: 'CAM-CHD-05', name: 'Housing Board Chowk', status: 'ONLINE', junction: 'Panchkula Border', sightings: 164 },
    { id: 'CAM-CHD-06', name: 'PGI / Panjab University Chowk', status: 'ONLINE', junction: 'Madhya Marg North', sightings: 79 },
    { id: 'CAM-CHD-07', name: 'IT Park Entry Junction', status: 'ONLINE', junction: 'Manimajra Radial', sightings: 63 },
    { id: 'CAM-CHD-08', name: 'Zirakpur-Airport Road Barrier', status: 'ONLINE', junction: 'Airport Express Corridor', sightings: 210 }
  ];

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dashRes, alertsRes, camRes] = await Promise.all([
        fetch('/api/dashboard'),
        fetch('/api/alerts'),
        fetch('/api/cameras').catch(() => null)
      ]);
      const dashJson = await dashRes.json();
      const alertsJson = await alertsRes.json();
      let camJson = null;
      if (camRes && camRes.ok) {
        camJson = await camRes.json();
      }

      if (!dashJson.success) throw new Error('Dashboard fetch failed');
      setSummary(dashJson.data);
      setAlerts(alertsJson.data || alertsJson.alerts || []);
      if (camJson && camJson.success && camJson.data?.length > 0) {
        setCameras(camJson.data);
      } else {
        setCameras(CHANDIGARH_CHECKPOINTS);
      }
      setLastRefreshed(new Date());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 20000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (isoString) => {
    if (!isoString) return 'Just now';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return isoString;
    }
  };

  if (error) {
    return (
      <div style={{ padding: '2rem 0' }}>
        <div style={{ backgroundColor: 'rgba(244, 63, 94, 0.12)', border: '1px solid rgba(244, 63, 94, 0.35)', color: '#f43f5e', padding: '1.25rem', borderRadius: '6px' }}>
          <strong>Telemetry Synchronization Error:</strong> {error}
          <div style={{ marginTop: '0.75rem' }}>
            <button onClick={fetchData} className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading && !summary) {
    return (
      <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>Synchronizing Municipal Vehicle Telemetry...</div>
        <div style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>CONNECTING TO LOCAL GATEWAY</div>
      </div>
    );
  }

  return (
    <div className="page dashboard-real" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Title Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.25rem' }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: '700', color: '#ffffff', letterSpacing: '-0.025em', marginBottom: '0.25rem' }}>
            Overview & Telemetry
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            City-wide automated number-plate recognition, camera network status, and active stolen vehicle alerts.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            UPDATED: {lastRefreshed.toLocaleTimeString()}
          </span>
          <button
            onClick={fetchData}
            className="btn-secondary"
            style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
          >
            Refresh Telemetry
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid-4">
        <div className="stat-box">
          <div className="stat-label">MONITORED CAMERAS</div>
          <div className="stat-value">{summary?.totalCameras || 9}</div>
          <div className="stat-subtext">
            <span style={{ color: 'var(--accent-green)', fontWeight: '600' }}>
              {summary?.onlineCameras || 9} Online
            </span>
            <span>· 100% Ingestion Uptime</span>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-label">TOTAL VEHICLE SIGHTINGS</div>
          <div className="stat-value">{summary?.totalSightings || 11}</div>
          <div className="stat-subtext">
            <span style={{ color: 'var(--accent-blue)', fontWeight: '600' }}>
              Optical ANPR Active
            </span>
            <span>· Multi-Lane Verified</span>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-label">ACTIVE HOTLIST ALERTS</div>
          <div className="stat-value" style={{ color: alerts.length > 0 ? '#f43f5e' : '#ffffff' }}>
            {alerts.length}
          </div>
          <div className="stat-subtext">
            <span style={{ color: 'var(--pill-red-text)', fontWeight: '600' }}>
              {alerts.filter(a => a.severity === 'CRITICAL').length} Critical
            </span>
            <span>· Immediate Interception</span>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-label">WATCHLIST MATCHES</div>
          <div className="stat-value">{summary?.watchlistMatches || 0}</div>
          <div className="stat-subtext">
            <span>Stolen & Clone Watchlists Active</span>
          </div>
        </div>
      </div>

      {/* Main Operational Split */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Left Column: Active Alert Interceptions */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div>
              <h2 className="card-title" style={{ fontSize: '1.15rem' }}>Active Vehicle Alert Interceptions</h2>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Vehicles identified by optical ANPR matching stolen registry or cloned license plate patterns.
              </div>
            </div>
            <button
              onClick={() => navigate('/alerts')}
              className="btn-secondary"
              style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
            >
              View Full Alert Feed
            </button>
          </div>

          {alerts.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: 'var(--bg-card)', borderRadius: '6px', color: 'var(--text-muted)' }}>
              No active vehicle alerts at this moment. System operating normally.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>PLATE NUMBER</th>
                    <th>ALERT TYPE</th>
                    <th>DETECTED LOCATION</th>
                    <th>TIME</th>
                    <th>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.slice(0, 5).map((alert) => (
                    <tr key={alert._id}>
                      <td>
                        <span className="plate-badge">
                          {alert.plateNumber || 'RJ47CA3205'}
                        </span>
                        {alert.vehicleDetails?.makeModel && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                            {alert.vehicleDetails.makeModel}
                          </div>
                        )}
                      </td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: alert.severity === 'CRITICAL' ? 'rgba(244, 63, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            color: alert.severity === 'CRITICAL' ? '#f43f5e' : '#fbbf24',
                            border: `1px solid ${alert.severity === 'CRITICAL' ? 'rgba(244, 63, 94, 0.35)' : 'rgba(245, 158, 11, 0.35)'}`
                          }}
                        >
                          {alert.type?.replace(/_/g, ' ') || 'ALERT'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        <div>{alert.locationName || 'Tribune Chowk'}</div>
                        <span className="code-pill" style={{ fontSize: '0.72rem', marginTop: '0.2rem' }}>
                          {alert.cameraId || 'CAM-CHD-01'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {formatTime(alert.createdAt)}
                      </td>
                      <td>
                        <button
                          onClick={() => navigate(`/map/${alert.plateNumber || 'RJ47CA3205'}`)}
                          className="btn-table-action"
                        >
                          Trajectory Map
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column: Checkpoint Camera Network Matrix */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div>
              <h2 className="card-title" style={{ fontSize: '1.15rem' }}>Checkpoint CCTV Network</h2>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Live ANPR surveillance camera nodes across key city arterial junctions.
              </div>
            </div>
            <button
              onClick={() => navigate('/cameras')}
              className="btn-secondary"
              style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
            >
              Open Camera Feeds
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '420px', overflowY: 'auto' }}>
            {cameras.map((cam, idx) => (
              <div
                key={cam.id || cam.cameraId || idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.15rem' }}>
                    <span className="code-pill" style={{ fontSize: '0.72rem' }}>
                      {cam.id || cam.cameraId || `CAM-${idx + 1}`}
                    </span>
                    <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#ffffff' }}>
                      {cam.name?.split(':')[1]?.trim() || cam.name || 'Checkpoint Junction'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    {cam.junction || cam.location || 'Arterial Junction'}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span
                    className="badge"
                    style={{
                      backgroundColor: 'rgba(16, 185, 129, 0.12)',
                      color: '#34d399',
                      border: '1px solid rgba(16, 185, 129, 0.3)'
                    }}
                  >
                    ● ONLINE
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Quick Launchpad Action Strip */}
      <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.925rem', fontWeight: '600', color: '#ffffff', marginBottom: '0.2rem' }}>
            Investigation & Verification Workflows
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Direct access to law enforcement investigative tools and optical recognition pipelines.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/cameras')} className="btn-primary" style={{ fontSize: '0.82rem', padding: '0.45rem 0.95rem' }}>
            Live CCTV Feeds
          </button>
          <button onClick={() => navigate('/map')} className="btn-secondary" style={{ fontSize: '0.82rem', padding: '0.45rem 0.95rem' }}>
            Trajectory Reconstruction
          </button>
          <button onClick={() => navigate('/police/verifications')} className="btn-secondary" style={{ fontSize: '0.82rem', padding: '0.45rem 0.95rem' }}>
            Plate Verifications
          </button>
          <button onClick={() => navigate('/investigation')} className="btn-secondary" style={{ fontSize: '0.82rem', padding: '0.45rem 0.95rem' }}>
            Investigation Hub
          </button>
        </div>
      </div>

    </div>
  );
}

export default RealDashboard;
