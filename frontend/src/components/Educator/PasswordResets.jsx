import { useState, useEffect } from 'react';
import api from '../../lib/api.js';

const PasswordResets = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await api.get('/educators/password-resets');
      setRequests(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load password reset requests');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (id) => {
    if (!window.confirm("Are you sure you want to reset this student's password to 'password'?")) return;
    setActionLoading(id);
    try {
      await api.post(`/educators/password-resets/${id}/reset`);
      // Remove from list after successful reset
      setRequests((prev) => prev.filter(r => r._id !== id));
      alert('Password reset successfully.');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <div className="panel"><div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><div className="spinner"></div></div></div>;
  if (error) return <div className="panel"><div className="alert alert-error">⚠️ {error}</div></div>;

  return (
    <div className="panel" style={{ animation: 'slideUp 0.4s ease' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>Password Reset Requests</h2>
          <p>Review and process password reset requests from students.</p>
        </div>
        <button className="button button--secondary button--sm" onClick={fetchRequests}>
          <span style={{ fontSize: '16px' }}>🔄</span> Refresh
        </button>
      </div>

      {requests.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '80px 20px', borderStyle: 'dashed' }}>
          <div style={{ fontSize: '56px', marginBottom: '16px', opacity: 0.8 }}>🎉</div>
          <h3 style={{ fontSize: '20px', color: 'var(--text-primary)', marginBottom: '8px' }}>All caught up!</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>There are no pending password reset requests at the moment.</p>
        </div>
      ) : (
        <div className="card-list">
          {requests.map(req => (
            <div key={req._id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--bg-accent)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold' }}>
                  {req.studentId?.name ? req.studentId.name.charAt(0).toUpperCase() : 'S'}
                </div>
                <div>
                  <h4 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {req.studentId?.name || 'Unknown Student'}
                    {req.studentId?.studentId && <span className="badge badge-info" style={{ fontSize: '11px', padding: '2px 8px' }}>ID: {req.studentId.studentId}</span>}
                  </h4>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span>📧 {req.studentId?.email || req.email}</span>
                    <span>🕒 {new Date(req.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  className="button button--primary" 
                  onClick={() => handleReset(req._id)}
                  disabled={actionLoading === req._id}
                  style={{ minWidth: '160px' }}
                >
                  {actionLoading === req._id ? '⏳ Resetting...' : '🔓 Reset to "password"'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PasswordResets;
