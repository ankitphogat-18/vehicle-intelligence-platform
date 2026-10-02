import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Login({ onAuthSuccess }) {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'CITIZEN'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
    const payload = isRegister
      ? {
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
          role: formData.role
        }
      : {
          email: formData.email.trim(),
          password: formData.password
        };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || data.error || 'Authentication failed');
      }

      // Store token & user profile in localStorage
      if (data.token) {
        localStorage.setItem('token', data.token);
      }
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      setSuccessMsg(isRegister ? 'Account created successfully! Redirecting...' : 'Login successful! Redirecting...');

      if (onAuthSuccess) {
        onAuthSuccess(data.user);
      }

      setTimeout(() => {
        navigate('/');
      }, 500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '440px', margin: '3rem auto', padding: '0 1rem' }}>
      <div className="card" style={{ padding: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <h2 className="card-title" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
            {isRegister ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p className="card-desc" style={{ fontSize: '0.9rem' }}>
            {isRegister
              ? 'Register to access City-Wide Vehicle Intelligence'
              : 'Sign in with your role-based credentials'}
          </p>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#f87171',
              padding: '0.75rem 1rem',
              borderRadius: '6px',
              fontSize: '0.875rem',
              marginBottom: '1.25rem'
            }}
          >
            {error}
          </div>
        )}

        {successMsg && (
          <div
            style={{
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              color: '#34d399',
              padding: '0.75rem 1rem',
              borderRadius: '6px',
              fontSize: '0.875rem',
              marginBottom: '1.25rem'
            }}
          >
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {isRegister && (
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                Full Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required={isRegister}
                placeholder="Officer John Doe"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              />
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
              Email Address
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="user@cityportal.gov"
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                outline: 'none'
              }}
            />
          </div>

          {isRegister && (
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                System Role
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              >
                <option value="CITIZEN">CITIZEN (Public Inquiries)</option>
                <option value="POLICE">POLICE (Law Enforcement & ANPR)</option>
                <option value="INCIDENT_MANAGEMENT">INCIDENT_MANAGEMENT (Command & Control)</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '0.5rem',
              padding: '0.75rem',
              backgroundColor: 'var(--accent-blue)',
              color: '#0b1120',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.95rem',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'opacity 0.2s'
            }}
          >
            {loading ? 'Authenticating...' : isRegister ? 'Register Account' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {isRegister ? (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsRegister(false);
                  setError(null);
                }}
                style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', fontWeight: '600', textDecoration: 'underline' }}
              >
                Sign In
              </button>
            </span>
          ) : (
            <span>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsRegister(true);
                  setError(null);
                }}
                style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', fontWeight: '600', textDecoration: 'underline' }}
              >
                Create one
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;
