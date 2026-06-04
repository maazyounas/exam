import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchNotifications();

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/notifications/student', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setNotifications(res.data);
    } catch (err) {
      console.error('Failed to fetch student notifications', err);
    }
  };

  const markAsRead = async (id, isReadLocally) => {
    if (isReadLocally) return;

    try {
      await axios.patch(`http://localhost:5000/api/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      // Update local state
      setNotifications(prev => prev.map(n => {
        if (n._id === id) {
          if (n.recipientId) {
            return { ...n, isRead: true };
          } else {
            return { ...n, readBy: [...(n.readBy || []), 'read'] }; // Dummy insert to mark read
          }
        }
        return n;
      }));
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  // Determine if a notification is unread
  // If it's a direct message, check isRead. If broadcast, check if my ID is in readBy.
  // Wait, the client doesn't have the student ID easily accessible unless decoded.
  // Actually, we can just check `!n.isRead` for direct, but for broadcast, `n.readBy` includes user ID.
  // Our backend sends the `readBy` array. We just need to check if we exist in it. 
  // Wait, does the backend send all readBy IDs? Yes. We can decode the token or just assume if we are the user, we can check.
  // Actually, let's parse the token to get the user ID.
  const getUserId = () => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
      return JSON.parse(atob(token.split('.')[1])).id;
    } catch {
      return null;
    }
  };
  const currentUserId = getUserId();

  const isUnread = (n) => {
    if (n.recipientId) {
      return !n.isRead;
    } else {
      return !n.readBy?.includes(currentUserId);
    }
  };

  const unreadCount = notifications.filter(isUnread).length;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-muted)',
          borderRadius: '50%',
          boxShadow: 'var(--shadow-xs)',
          width: '40px',
          height: '40px',
          fontSize: '20px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}
      >
        🔔
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-5px',
            right: '-5px',
            background: 'var(--danger)',
            color: '#fff',
            fontSize: '10px',
            fontWeight: 'bold',
            padding: '2px 6px',
            borderRadius: '10px',
            lineHeight: 1
          }}>
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '50px',
          right: '0',
          width: '320px',
          maxHeight: '400px',
          overflowY: 'auto',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 'bold' }}>
            Notifications
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No notifications yet.
              </div>
            ) : (
              notifications.map(n => {
                const unread = isUnread(n);
                return (
                  <div 
                    key={n._id} 
                    onClick={() => markAsRead(n._id, !unread)}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--border)',
                      background: unread ? 'var(--bg-surface-hover)' : 'transparent',
                      cursor: unread ? 'pointer' : 'default',
                      transition: 'background 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '14px', color: unread ? 'var(--text)' : 'var(--text-secondary)' }}>
                        {n.title}
                      </strong>
                      {unread && <span style={{ width: '8px', height: '8px', background: 'var(--primary)', borderRadius: '50%', flexShrink: 0, marginTop: '4px' }}></span>}
                    </div>
                    <p style={{ margin: '0 0 6px', fontSize: '13px', color: 'var(--text-muted)' }}>{n.message}</p>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      From: {n.senderId?.name || 'Educator'} • {new Date(n.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
