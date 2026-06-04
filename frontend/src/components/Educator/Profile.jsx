import { useState, useEffect } from 'react';
import api from '../../lib/api.js';

const getInitials = (name = '') =>
  name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

const Profile = () => {
  const [profile, setProfile] = useState({});
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const res = await api.get('/educators/profile');
        setProfile(res.data);
        setForm(res.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchProfile();
  }, []);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleUpdate = async e => {
    e.preventDefault(); setSaving(true);
    try {
      const res = await api.put('/educators/profile', form);
      setProfile(res.data);
      setForm(res.data);
      setEdit(false);
    } catch (err) { alert('Failed to update profile'); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="loading-state" style={{ minHeight: '200px' }}>
      <div className="spinner" /><span>Loading profile…</span>
    </div>
  );

  return (
    <div className="panel">
      <div className="page-header">
        <h2>👤 Profile</h2>
        <p>Manage your account information</p>
      </div>

      {!edit ? (
        <div className="profile-card" style={{ maxWidth: '500px', animation: 'slideUp 0.4s ease' }}>
          <div className="profile-card-header">
            <div className="profile-avatar-lg">{getInitials(profile.name)}</div>
            <div className="profile-card-name">{profile.name}</div>
            <div className="profile-card-role">Educator</div>
          </div>
          <div className="profile-card-body">
            {[
              { icon: '✉️', label: 'Email',      value: profile.email },
              { icon: '🏛️', label: 'Department', value: profile.department || 'Not set' },
              { icon: '🎓', label: 'Role',        value: 'Educator' },
            ].map(row => (
              <div key={row.label} className="info-row">
                <div className="info-row-icon">{row.icon}</div>
                <div className="info-row-content">
                  <div className="info-row-label">{row.label}</div>
                  <div className="info-row-value">{row.value}</div>
                </div>
              </div>
            ))}
            <div style={{ marginTop: '20px' }}>
              <button className="button button--primary" onClick={() => setEdit(true)}>✏️ Edit Profile</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="panel-form" style={{ maxWidth: '500px', animation: 'slideUp 0.3s ease' }}>
          <h4>✏️ Edit Profile</h4>
          <form onSubmit={handleUpdate}>
            <div className="form-row" style={{ marginBottom: '12px' }}>
              <label className="form-label">Full Name</label>
              <input name="name" placeholder="Full Name" value={form.name || ''} onChange={handleChange} required />
            </div>
            <div className="form-row" style={{ marginBottom: '12px' }}>
              <label className="form-label">Department</label>
              <input name="department" placeholder="Department" value={form.department || ''} onChange={handleChange} />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button type="submit" className="button button--primary" disabled={saving} style={{ flex: 1 }}>
                {saving ? 'Saving…' : '💾 Save Changes'}
              </button>
              <button type="button" className="button button--ghost" onClick={() => setEdit(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Profile;
