import React from 'react';
import { NavLink } from 'react-router-dom';

function Sidebar({ user }) {
  if (!user) {
    return null;
  }

  const renderIcon = (type) => {
    switch (type) {
      case 'overview':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
          </svg>
        );
      case 'camera':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M23 7l-7 5 7 5V7z" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
        );
      case 'verification':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
          </svg>
        );
      case 'alert':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        );
      case 'map':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
            <line x1="8" y1="2" x2="8" y2="18" />
            <line x1="16" y1="6" x2="16" y2="22" />
          </svg>
        );
      case 'investigation':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        );
      case 'car':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M5 17h14m-12 0a2 2 0 100 4 2 2 0 000-4zm10 0a2 2 0 100 4 2 2 0 000-4zM3 9l2-5h14l2 5v7H3V9z" />
          </svg>
        );
      case 'register':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <line x1="9" y1="15" x2="15" y2="15" />
          </svg>
        );
      case 'analytics':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        );
      default:
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10" />
          </svg>
        );
    }
  };

  let navItems = [];

  if (user.role === 'CITIZEN') {
    navItems = [
      { path: '/citizen', label: 'My Vehicles', iconType: 'car' },
      { path: '/citizen/register', label: 'Register Vehicle', iconType: 'register' }
    ];
  } else if (user.role === 'POLICE') {
    navItems = [
      { path: '/', label: 'Overview & Telemetry', iconType: 'overview' },
      { path: '/cameras', label: 'CCTV Checkpoint Streams', iconType: 'camera' },
      { path: '/police/verifications', label: 'Vehicle Verifications', iconType: 'verification' },
      { path: '/alerts', label: 'Active Hotlist Alerts', iconType: 'alert' },
      { path: '/map', label: 'City Trajectory GIS Map', iconType: 'map' },
      { path: '/investigation', label: 'Investigation Hub', iconType: 'investigation' }
    ];
  } else if (user.role === 'INCIDENT_MANAGEMENT') {
    navItems = [
      { path: '/incidents', label: 'Expressway Incidents', iconType: 'alert' },
      { path: '/map', label: 'Expressway GIS Map', iconType: 'map' },
      { path: '/analytics', label: 'Traffic Flow Analytics', iconType: 'analytics' }
    ];
  } else {
    navItems = [
      { path: '/', label: 'Overview', iconType: 'overview' },
      { path: '/cameras', label: 'Camera Network', iconType: 'camera' }
    ];
  }

  const getRoleHeaderBadge = (role) => {
    switch (role) {
      case 'POLICE':
        return { label: 'POLICE INTEL', color: '#60a5fa', bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.2)' };
      case 'INCIDENT_MANAGEMENT':
        return { label: 'INCIDENT CMD', color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.2)' };
      case 'CITIZEN':
      default:
        return { label: 'CITIZEN PORTAL', color: '#34d399', bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.2)' };
    }
  };

  const badge = getRoleHeaderBadge(user.role);

  return (
    <aside className="sidebar">
      {/* Brand header */}
      <div className="sidebar-header">
        <div className="sidebar-title">
          <div className="sidebar-brand-mark">V</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: '800', letterSpacing: '-0.03em', color: '#ffffff', lineHeight: '1.2', textTransform: 'uppercase' }}>
              VIP Intel
            </span>
            <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)', fontWeight: '500', letterSpacing: '0.04em' }}>
              VEHICLE INTELLIGENCE
            </span>
          </div>
        </div>
        <span
          className="sidebar-badge"
          style={{
            backgroundColor: badge.bg,
            color: badge.color,
            border: `1px solid ${badge.border}`,
          }}
        >
          {badge.label}
        </span>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="sidebar-section-label">OPERATIONAL WORKSPACE</div>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            end={item.path === '/' || item.path === '/citizen'}
          >
            {renderIcon(item.iconType)}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* System node status footer */}
      <div className="sidebar-footer-node">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
          <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase' }}>SYSTEM NODE</span>
          <span style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 6px rgba(16,185,129,0.7)' }}></span>
            ONLINE
          </span>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)' }}>
          CHD-GATEWAY-01
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
