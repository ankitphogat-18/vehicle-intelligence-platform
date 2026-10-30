import React from 'react';
import { useNavigate, Link } from 'react-router-dom';

function Navbar({ user, onLogout, backendHealth }) {
  const navigate = useNavigate();
  const isHealthy = backendHealth && backendHealth.status === 'ok';

  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case 'POLICE':
        return {
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          color: '#3b82f6',
          border: '1px solid rgba(59, 130, 246, 0.25)'
        };
      case 'INCIDENT_MANAGEMENT':
        return {
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          color: '#d97706',
          border: '1px solid rgba(245, 158, 11, 0.25)'
        };
      case 'CITIZEN':
      default:
        return {
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          color: '#059669',
          border: '1px solid rgba(16, 185, 129, 0.25)'
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
    <header className="header">
      {/* Left — brand + status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div className="header-brand-dot" />
          <span style={{ fontSize: '0.88rem', fontWeight: '800', color: '#111827', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
            Vehicle Intelligence Console
          </span>
          <span style={{
            fontSize: '0.65rem',
            color: '#6b7280',
            padding: '0.12rem 0.45rem',
            backgroundColor: '#f3f4f6',
            borderRadius: '999px',
            border: '1px solid #e5e7eb',
            fontFamily: 'var(--font-mono)',
            fontWeight: '600',
            letterSpacing: '0.02em'
          }}>
            v2.4
          </span>
        </div>

        {backendHealth && (
          <div className="status-pill">
            <span className={`status-dot ${isHealthy ? 'online' : 'offline'}`}></span>
            <span>API Telemetry {isHealthy ? 'Operational' : 'Unavailable'}</span>
          </div>
        )}
      </div>

      {/* Right — user info + logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#111827', lineHeight: '1.2' }}>
                {user.name}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                {user.email}
              </div>
            </div>

            <span
              style={{
                fontSize: '0.62rem',
                fontWeight: '700',
                padding: '0.22rem 0.6rem',
                borderRadius: '999px',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                ...getRoleBadgeStyle(user.role)
              }}
            >
              {user.role}
            </span>

            <button
              onClick={handleLogoutClick}
              style={{
                background: '#000000',
                color: '#ffffff',
                border: '2px solid #000000',
                padding: '0.38rem 1rem',
                borderRadius: '999px',
                fontSize: '0.72rem',
                fontWeight: '700',
                cursor: 'pointer',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                transition: 'background-color 0.15s ease, color 0.15s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#ef4444';
                e.currentTarget.style.borderColor = '#ef4444';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = '#000000';
                e.currentTarget.style.borderColor = '#000000';
              }}
              title="Terminate current session"
            >
              Exit
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            style={{
              background: '#000000',
              color: '#ffffff',
              border: '2px solid #000000',
              padding: '0.4rem 1rem',
              borderRadius: '999px',
              fontSize: '0.78rem',
              fontWeight: '700',
              textDecoration: 'none',
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}
          >
            Authenticate
          </Link>
        )}
      </div>
    </header>
  );
}

export default Navbar;
