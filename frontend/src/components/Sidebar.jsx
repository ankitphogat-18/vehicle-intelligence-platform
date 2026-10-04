import React from 'react';
import { NavLink } from 'react-router-dom';

function Sidebar({ user }) {
  if (!user) {
    return null;
  }

  let navItems = [];

  if (user.role === 'CITIZEN') {
    navItems = [
      { path: '/citizen', label: 'My Vehicles', icon: '🚗' },
      { path: '/citizen/register', label: 'Register Vehicle', icon: '📝' }
    ];
  } else if (user.role === 'POLICE') {
    navItems = [
      { path: '/', label: 'Overview', icon: '📊' },
      { path: '/cameras', label: 'CCTV Ingestion & Cameras', icon: '📹' },
      { path: '/police/verifications', label: 'Vehicle Verifications', icon: '📋' },
      { path: '/alerts', label: 'Active Stolen Alerts', icon: '🚨' },
      { path: '/map', label: 'GIS / Vehicle Map', icon: '🗺️' },
      { path: '/investigation', label: 'Investigation Hub', icon: '🔍' }
    ];
  } else if (user.role === 'INCIDENT_MANAGEMENT') {
    navItems = [
      { path: '/incidents', label: 'Expressway Incidents', icon: '⚠️' },
      { path: '/map', label: 'Expressway GIS Map', icon: '🗺️' },
      { path: '/analytics', label: 'Traffic Flow Analytics', icon: '📈' }
    ];
  } else {
    // Default fallback
    navItems = [
      { path: '/', label: 'Overview', icon: '📊' },
      { path: '/cameras', label: 'Camera Network', icon: '📷' }
    ];
  }

  const getRoleHeaderBadge = (role) => {
    switch (role) {
      case 'POLICE':
        return { label: 'POLICE', color: '#60a5fa', bg: 'rgba(59, 130, 246, 0.15)' };
      case 'INCIDENT_MANAGEMENT':
        return { label: 'COMMAND', color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.15)' };
      case 'CITIZEN':
      default:
        return { label: 'CITIZEN', color: '#34d399', bg: 'rgba(16, 185, 129, 0.15)' };
    }
  };

  const badge = getRoleHeaderBadge(user.role);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🚔</span>
            <span>Vehicle Intel</span>
          </span>
          <span
            style={{
              fontSize: '0.65rem',
              fontWeight: '700',
              padding: '0.15rem 0.45rem',
              borderRadius: '4px',
              backgroundColor: badge.bg,
              color: badge.color,
              letterSpacing: '0.05em'
            }}
          >
            {badge.label}
          </span>
        </div>
      </div>
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            end={item.path === '/' || item.path === '/citizen'}
          >
            <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
