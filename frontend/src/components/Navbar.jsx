import React from 'react';
import { useNavigate, Link } from 'react-router-dom';

function Navbar({ user, onLogout, backendHealth }) {
  const navigate = useNavigate();
  const isHealthy = backendHealth && backendHealth.status === 'ok';

  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case 'POLICE':
        return {
          backgroundColor: 'rgba(59, 130, 246, 0.15)',
          color: '#60a5fa',
          border: '1px solid rgba(59, 130, 246, 0.35)'
        };
      case 'INCIDENT_MANAGEMENT':
        return {
          backgroundColor: 'rgba(245, 158, 11, 0.15)',
          color: '#fbbf24',
          border: '1px solid rgba(245, 158, 11, 0.35)'
        };
      case 'CITIZEN':
      default:
        return {
          backgroundColor: 'rgba(16, 185, 129, 0.15)',
          color: '#34d399',
          border: '1px solid rgba(16, 185, 129, 0.35)'
        };
    }
  };

  const handleLogoutClick = () => {
    if (onLogout) {
      onLogout();
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
    }
  };

  return (
    <header className="header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1.5rem', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link to="/" style={{ textDecoration: 'none', color: 'var(--text-primary)', fontWeight: '700', fontSize: '1.05rem', letterSpacing: '-0.02em' }}>
          City-Wide Vehicle Intelligence
        </Link>
        {backendHealth && (
          <div className="status-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span className={`status-dot ${isHealthy ? 'online' : 'offline'}`}></span>
            <span>API {isHealthy ? 'Active' : 'Offline'}</span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-primary)' }}>
              {user.name}
            </span>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: '700',
                padding: '0.2rem 0.6rem',
                borderRadius: '9999px',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                ...getRoleBadgeStyle(user.role)
              }}
            >
              {user.role}
            </span>
            <button
              onClick={handleLogoutClick}
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.8rem',
                fontWeight: '600',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                color: '#f87171',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'background-color 0.15s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.25)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.12)'; }}
            >
              Logout
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            style={{
              padding: '0.4rem 0.9rem',
              fontSize: '0.85rem',
              fontWeight: '600',
              backgroundColor: 'var(--accent-blue)',
              color: '#0b1120',
              borderRadius: '6px',
              textDecoration: 'none'
            }}
          >
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
}

export default Navbar;
