import React, { useEffect, useState } from 'react';

function RealDashboard({ backendHealth }) {
  const [summary, setSummary] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashRes, alertsRes] = await Promise.all([
          fetch('/api/dashboard'),
          fetch('/api/alerts')
        ]);
        const dashJson = await dashRes.json();
        const alertsJson = await alertsRes.json();
        if (!dashJson.success) throw new Error('Dashboard fetch failed');
        if (!alertsJson.success) throw new Error('Alerts fetch failed');
        setSummary(dashJson.data);
        setAlerts(alertsJson.data.slice(0, 5));
        setError(null);
      } catch (err) {
        setError(err.message);
      }
    };
    fetchData();
  }, []);

  if (error) return <div className="alert error">{error}</div>;
  if (!summary) return <div>Loading dashboard...</div>;

  return (
    <div className="page dashboard-real">
      <h2>Dashboard</h2>
      <div className="grid-4">
        <div className="stat-box"><div className="stat-label">Total Cameras</div><div className="stat-value">{summary.totalCameras}</div></div>
        <div className="stat-box"><div className="stat-label">Online Cameras</div><div className="stat-value">{summary.onlineCameras}</div></div>
        <div className="stat-box"><div className="stat-label">Total Sightings</div><div className="stat-value">{summary.totalSightings}</div></div>
        <div className="stat-box"><div className="stat-label">Active Alerts</div><div className="stat-value">{summary.activeAlerts}</div></div>
      </div>
      <h3>Recent Alerts</h3>
      {alerts.length === 0 ? (
        <p>No recent alerts.</p>
      ) : (
        <ul className="alert-list">
          {alerts.map(a => (
            <li key={a._id}><strong>{a.type}</strong> – {a.description} (Status: {a.status})</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default RealDashboard;

