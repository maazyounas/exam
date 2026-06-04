import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api.js';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    
    try {
      const res = await api.post('/auth/forgot-password', { email });
      setMessage(res.data.message || 'Password reset request sent successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send password reset request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f0f2f8 0%, #eef2ff 100%)', padding: '20px' }}>
      <div className="auth-container" style={{ maxWidth: '400px' }}>
        <div className="auth-logo">
          <span className="auth-logo-icon">🔐</span>
        </div>
        <h2>Forgot Password?</h2>
        <p className="auth-subtitle">Enter your student email to request a password reset.</p>

        {error && (
          <div className="alert-error" style={{ marginBottom: '16px' }}>
            ⚠️ {error}
          </div>
        )}

        {message && (
          <div className="success-message" style={{ background: 'var(--success-light)', color: 'var(--success)', border: '1px solid var(--success-border)', borderRadius: 'var(--radius-md)', padding: '12px', fontSize: '14px', marginBottom: '16px' }}>
            ✅ {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Student Email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          
          <button type="submit" className="btn-auth" disabled={loading} style={{ marginTop: '8px' }}>
            {loading ? '⏳ Sending request…' : '📨 Send Request'}
          </button>
        </form>

        <p style={{ marginTop: '24px' }}>
          <Link to="/login">← Back to Login</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
