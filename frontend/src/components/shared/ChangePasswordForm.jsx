import { useState } from 'react';
import api from '../../lib/api.js';

const initialForm = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

const ChangePasswordForm = ({ roleLabel }) => {
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    const token = localStorage.getItem('token');

    if (!token) {
      setError('Your session has expired. Please log in again and then change your password.');
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }

    setSaving(true);
    try {
      const res = await api.post('/auth/change-password', form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessage(res.data.message || 'Password changed successfully.');
      setForm(initialForm);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setError('Your session is invalid or expired. Please log in again, then try changing your password.');
      } else {
        setError(err.response?.data?.message || 'Failed to change password.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="panel-form" style={{ maxWidth: '560px', animation: 'slideUp 0.35s ease' }}>
      <h4>Change Password</h4>
      <p style={{ marginTop: 0, color: 'var(--text-secondary)' }}>
        Update your {roleLabel.toLowerCase()} account password securely.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="form-row" style={{ marginBottom: '12px' }}>
          <label className="form-label">Current Password</label>
          <input
            type="password"
            name="currentPassword"
            value={form.currentPassword}
            onChange={handleChange}
            placeholder="Enter current password"
            required
          />
        </div>

        <div className="form-row" style={{ marginBottom: '12px' }}>
          <label className="form-label">New Password</label>
          <input
            type="password"
            name="newPassword"
            value={form.newPassword}
            onChange={handleChange}
            placeholder="Enter new password"
            minLength={6}
            required
          />
        </div>

        <div className="form-row" style={{ marginBottom: '12px' }}>
          <label className="form-label">Confirm New Password</label>
          <input
            type="password"
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={handleChange}
            placeholder="Confirm new password"
            minLength={6}
            required
          />
        </div>

        {error ? (
          <div style={{ color: '#b42318', marginBottom: '12px', fontSize: '14px' }}>{error}</div>
        ) : null}

        {message ? (
          <div style={{ color: '#027a48', marginBottom: '12px', fontSize: '14px' }}>{message}</div>
        ) : null}

        <button type="submit" className="button button--primary" disabled={saving}>
          {saving ? 'Updating Password...' : 'Save New Password'}
        </button>
      </form>
    </div>
  );
};

export default ChangePasswordForm;
