import React, { useState, useEffect } from 'react';

function PoliceVerificationQueue() {
  const [pendingList, setPendingList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    };
  };

  const fetchPending = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/police/pending-verifications', {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Failed to fetch pending queue');
      }
      setPendingList(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleAction = async (vehicleId, plateNumber, action) => {
    setActionLoadingId(vehicleId);
    setError(null);
    setFeedback(null);

    try {
      const res = await fetch(`/api/police/verify-vehicle/${vehicleId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Failed to update vehicle');
      }

      // Optimistically remove from list
      setPendingList((prev) => prev.filter((v) => v._id !== vehicleId));

      setFeedback({
        type: action === 'APPROVE' ? 'success' : 'warn',
        message:
          action === 'APPROVE'
            ? `Vehicle ${plateNumber} approved & marked VERIFIED.`
            : `Vehicle ${plateNumber} rejected & registration removed.`
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="page police-queue" style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)' }}>
            Vehicle Document Verification Queue
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Review and approve citizen vehicle registration submissions & RC document proofs.
          </p>
        </div>

        <button
          onClick={fetchPending}
          style={{
            padding: '0.45rem 0.95rem',
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            fontSize: '0.85rem',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          🔄 Refresh Queue ({pendingList.length})
        </button>
      </div>

      {error && (
        <div
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#f87171',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            marginBottom: '1.25rem',
            fontSize: '0.9rem'
          }}
        >
          {error}
        </div>
      )}

      {feedback && (
        <div
          style={{
            backgroundColor: feedback.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
            border: `1px solid ${feedback.type === 'success' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
            color: feedback.type === 'success' ? '#34d399' : '#fbbf24',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            marginBottom: '1.25rem',
            fontSize: '0.9rem'
          }}
        >
          {feedback.message}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Loading pending verifications...
        </div>
      ) : pendingList.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>✅</div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
            Queue is Clear
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto' }}>
            There are currently no pending vehicle registrations awaiting police document verification.
          </p>
        </div>
      ) : (
        <div className="card" style={{ overflowX: 'auto', padding: '0.5rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.85rem 1rem' }}>Citizen Owner</th>
                <th style={{ padding: '0.85rem 1rem' }}>License Plate</th>
                <th style={{ padding: '0.85rem 1rem' }}>Make & Model</th>
                <th style={{ padding: '0.85rem 1rem' }}>Color</th>
                <th style={{ padding: '0.85rem 1rem' }}>RC Document Proof</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingList.map((item) => (
                <tr
                  key={item._id}
                  style={{
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    transition: 'background-color 0.15s'
                  }}
                >
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                      {item.ownerId?.name || 'Citizen User'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {item.ownerId?.email || 'N/A'}
                    </div>
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontWeight: '700',
                        fontSize: '0.95rem',
                        backgroundColor: '#0f172a',
                        color: '#f8fafc',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        border: '1px solid #334155'
                      }}
                    >
                      {item.plateNumber}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text-primary)', fontWeight: '500' }}>
                    {item.makeModel}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>
                    {item.color || '—'}
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    {item.rcDocPath ? (
                      <a
                        href={item.rcDocPath}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          color: 'var(--accent-blue)',
                          textDecoration: 'none',
                          fontWeight: '600',
                          fontSize: '0.8rem'
                        }}
                      >
                        <span>📄 View RC Doc</span>
                      </a>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No Doc Link</span>
                    )}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                      <button
                        disabled={actionLoadingId === item._id}
                        onClick={() => handleAction(item._id, item.plateNumber, 'APPROVE')}
                        style={{
                          padding: '0.4rem 0.85rem',
                          backgroundColor: '#10b981',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          fontWeight: '700',
                          fontSize: '0.8rem',
                          cursor: actionLoadingId === item._id ? 'not-allowed' : 'pointer',
                          opacity: actionLoadingId === item._id ? 0.6 : 1,
                          transition: 'background-color 0.15s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#059669'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#10b981'; }}
                      >
                        ✓ Approve
                      </button>
                      <button
                        disabled={actionLoadingId === item._id}
                        onClick={() => handleAction(item._id, item.plateNumber, 'REJECT')}
                        style={{
                          padding: '0.4rem 0.85rem',
                          backgroundColor: 'rgba(239, 68, 68, 0.15)',
                          color: '#f87171',
                          border: '1px solid rgba(239, 68, 68, 0.4)',
                          borderRadius: '6px',
                          fontWeight: '700',
                          fontSize: '0.8rem',
                          cursor: actionLoadingId === item._id ? 'not-allowed' : 'pointer',
                          opacity: actionLoadingId === item._id ? 0.6 : 1,
                          transition: 'background-color 0.15s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.25)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)'; }}
                      >
                        ✕ Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default PoliceVerificationQueue;
