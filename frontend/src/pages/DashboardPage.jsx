import React from 'react';
import RealDashboard from './RealDashboard';

function DashboardPage({ backendHealth }) {
  return <RealDashboard backendHealth={backendHealth} />;
}

export default DashboardPage;
