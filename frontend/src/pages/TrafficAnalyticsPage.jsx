import React, { useEffect, useState } from 'react';

function TrafficAnalyticsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch('/api/analytics');
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Failed to load analytics');
        setAnalytics(json.data);
      } catch (err) {
        setError(err.message);
      }
    };
    fetchAnalytics();
  }, []);

  if (error) return <div className="alert error">{error}</div>;
  if (!analytics) return <div>Loading analytics...</div>;

  return (
    <div className="page analytics-page">
      <h2>Traffic Analytics</h2>
      <pre style={{ backgroundColor: 'var(--bg-card)', padding: '1rem', borderRadius: '6px' }}>
        {JSON.stringify(analytics, null, 2)}
      </pre>
    </div>
  );
}

export default TrafficAnalyticsPage;

