import { useState, useEffect } from 'react';
import axios from 'axios';

const Notifications = () => {
  const [students, setStudents] = useState([]);
  const [sentNotifications, setSentNotifications] = useState([]);
  
  const [recipientId, setRecipientId] = useState(''); // '' means All Students
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStudents();
    fetchSentNotifications();
  }, []);

  const fetchStudents = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/educators/students', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setStudents(res.data);
    } catch (err) {
      console.error('Failed to fetch students', err);
    }
  };

  const fetchSentNotifications = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/notifications/sent', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSentNotifications(res.data);
    } catch (err) {
      console.error('Failed to fetch sent notifications', err);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!title || !message) {
      setError('Title and message are required.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await axios.post('http://localhost:5000/api/notifications', {
        recipientId: recipientId === '' ? null : recipientId,
        title,
        message
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      setSuccess('Notification sent successfully!');
      setTitle('');
      setMessage('');
      setRecipientId('');
      fetchSentNotifications(); // refresh list
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send notification');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this notification? It will be removed for all students.')) return;
    
    try {
      await axios.delete(`http://localhost:5000/api/notifications/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSentNotifications(prev => prev.filter(n => n._id !== id));
      setSuccess('Notification deleted successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete notification');
    }
  };

  return (
    <div className="panel" style={{ animation: 'fadeIn 0.4s ease' }}>
      <div className="page-header">
        <h2>📢 Notifications</h2>
        <p>Send messages and announcements to your students.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Send Notification Form */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <h3 style={{ margin: '0 0 20px' }}>Compose Message</h3>
          
          {success && <div style={{ background: 'var(--success)', color: '#fff', padding: '10px', borderRadius: '4px', marginBottom: '16px' }}>{success}</div>}
          {error && <div style={{ background: 'var(--danger)', color: '#fff', padding: '10px', borderRadius: '4px', marginBottom: '16px' }}>{error}</div>}

          <form onSubmit={handleSend}>
            <div className="form-group" style={{ position: 'relative' }}>
              <label>Recipient</label>
              <div 
                className="input-field" 
                style={{ cursor: 'text', minHeight: '40px', display: 'flex', alignItems: 'center' }}
                onClick={() => setIsDropdownOpen(true)}
              >
                {recipientId === '' ? (
                  isDropdownOpen ? (
                    <input 
                      autoFocus
                      type="text"
                      placeholder="Search by name or 5-digit ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{ border: 'none', background: 'transparent', width: '100%', outline: 'none', color: 'var(--text)' }}
                    />
                  ) : (
                    <span style={{ color: 'var(--text)' }}>Broadcast to All Students</span>
                  )
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text)' }}>
                      {students.find(s => s._id === recipientId)?.name} ({students.find(s => s._id === recipientId)?.studentId || 'No ID'})
                    </span>
                    <button 
                      type="button" 
                      onClick={(e) => { e.stopPropagation(); setRecipientId(''); setIsDropdownOpen(true); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                    >
                      &times;
                    </button>
                  </div>
                )}
              </div>

              {isDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  zIndex: 10,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}>
                  <div 
                    onClick={() => { setRecipientId(''); setIsDropdownOpen(false); setSearchTerm(''); }}
                    style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid var(--border)', background: recipientId === '' ? 'var(--bg-surface-hover)' : 'transparent' }}
                  >
                    Broadcast to All Students
                  </div>
                  {students.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || (s.studentId && s.studentId.includes(searchTerm))).map(student => (
                    <div 
                      key={student._id} 
                      onClick={() => { setRecipientId(student._id); setIsDropdownOpen(false); setSearchTerm(''); }}
                      style={{ padding: '10px', cursor: 'pointer', background: recipientId === student._id ? 'var(--bg-surface-hover)' : 'transparent' }}
                      onMouseEnter={(e) => e.target.style.background = 'var(--bg-surface-hover)'}
                      onMouseLeave={(e) => e.target.style.background = recipientId === student._id ? 'var(--bg-surface-hover)' : 'transparent'}
                    >
                      {student.name} ({student.studentId || 'No ID'})
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="form-group" style={{ marginTop: '16px' }}>
              <label>Title *</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="e.g. Exam Schedule Update"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ marginTop: '16px' }}>
              <label>Message *</label>
              <textarea 
                className="input-field" 
                rows="5"
                placeholder="Write your message here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                style={{ resize: 'vertical' }}
              />
            </div>

            <button 
              type="submit" 
              className="button button--primary btn-gradient" 
              style={{ marginTop: '20px', width: '100%' }}
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Notification'}
            </button>
          </form>
        </div>

        {/* Sent History */}
        <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: '0 0 20px' }}>Sent History</h3>
          
          <div style={{ overflowY: 'auto', flex: 1, paddingRight: '10px' }}>
            {sentNotifications.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', paddingTop: '40px' }}>
                No notifications sent yet.
              </div>
            ) : (
              sentNotifications.map(notification => (
                <div key={notification._id} style={{ 
                  background: 'var(--bg-surface-muted)', 
                  padding: '12px', 
                  borderRadius: '8px', 
                  marginBottom: '12px',
                  borderLeft: '4px solid #0af'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontSize: '14px' }}>{notification.title}</strong>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {new Date(notification.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <button 
                      onClick={() => handleDelete(notification._id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: '16px', padding: '0 4px' }}
                      title="Delete Notification"
                    >
                      🗑️
                    </button>
                  </div>
                  <p style={{ fontSize: '13px', margin: '0 0 8px', color: 'var(--text-secondary)' }}>
                    {notification.message}
                  </p>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    To: {notification.recipientId ? notification.recipientId.name : 'All Students'}
                    {notification.recipientId && notification.isRead && <span style={{ marginLeft: '8px', color: 'var(--success)' }}>✓ Read</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notifications;
