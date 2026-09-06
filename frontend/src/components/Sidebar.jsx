import React from 'react';
import { NavLink } from 'react-router-dom';

function Sidebar() {
  const navItems = [
    { path: '/', label: 'Overview Dashboard' },
    { path: '/cameras', label: 'Camera Network (Phase 2)' },
    { path: '/anpr', label: 'ANPR / OCR (Phase 5)' },
    { path: '/trajectories', label: 'Vehicle Trajectories (Phase 7)' },
    { path: '/map', label: 'GIS Live Map (Phase 8)' },
    { path: '/analytics', label: 'Traffic Analytics (Phase 9)' },
    { path: '/alerts', label: 'Alert Center (Phase 10)' },
    { path: '/investigation', label: 'Investigation Hub (Phase 11)' }
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title">
          <span>🚔 Vehicle Intel</span>
          <span className="sidebar-badge">SIH 2026</span>
        </div>
      </div>
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            end={item.path === '/'}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;

