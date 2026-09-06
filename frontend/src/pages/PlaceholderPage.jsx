import React from 'react';

function PlaceholderPage({ title, phase, description }) {
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="card-title">{title}</h2>
        <span className="badge badge-blue">{phase}</span>
      </div>
      <p className="card-desc" style={{ marginTop: '0.5rem' }}>
        {description}
      </p>
      <div
        style={{
          marginTop: '1.5rem',
          padding: '2rem',
          border: '1px dashed var(--border-color)',
          borderRadius: '8px',
          textAlign: 'center',
          color: 'var(--text-muted)'
        }}
      >
        <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Module Scheduled for Later Phase</p>
        <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
          This component shell will be activated during subsequent implementation phases in accordance with the project specification.
        </p>
      </div>
    </div>
  );
}

export default PlaceholderPage;

