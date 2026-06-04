import { useState, useEffect } from 'react';
import api from '../../lib/api.js';

const STATUS_OPTIONS = ['Open', 'In Progress', 'Resolved'];

const STATUS_STYLE = {
  Open: { bg: 'var(--danger-light, #fee2e2)', color: 'var(--danger, #dc2626)' },
  'In Progress': { bg: 'var(--warning-light, #fef3c7)', color: 'var(--warning, #d97706)' },
  Resolved: { bg: 'var(--success-light, #dcfce7)', color: 'var(--success, #16a34a)' },
};

const CATEGORY_ICON = {
  Technical: '🔧',
  Content: '📖',
  Accessibility: '♿',
  Other: '❓',
};

const StarRating = ({ rating }) => (
  <span style={{ letterSpacing: 2 }}>
    {[1, 2, 3, 4, 5].map(s => (
      <span key={s} style={{ color: rating >= s ? '#f59e0b' : 'var(--border, #d1d5db)', fontSize: 18 }}>★</span>
    ))}
  </span>
);

const FeedbackIssues = () => {
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState('');
  const [feedbacks, setFeedbacks] = useState([]);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [examsLoading, setExamsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('feedback');
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    api.get('/educators/exams')
      .then(res => setExams(res.data))
      .catch(err => console.error(err))
      .finally(() => setExamsLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedExam) { setFeedbacks([]); setIssues([]); return; }
    setLoading(true);
    Promise.all([
      api.get(`/feedback/${selectedExam}`),
      api.get(`/issues/${selectedExam}`)
    ])
      .then(([fbRes, issueRes]) => {
        setFeedbacks(fbRes.data.feedbacks || []);
        setIssues(issueRes.data.issues || []);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [selectedExam]);

  const handleStatusChange = async (issueId, newStatus) => {
    setUpdatingId(issueId);
    try {
      await api.patch(`/issues/${issueId}`, { status: newStatus });
      setIssues(prev => prev.map(i => i._id === issueId ? { ...i, status: newStatus } : i));
    } catch (err) {
      console.error('Failed to update issue status:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const avgRating = feedbacks.length > 0
    ? (feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length).toFixed(1)
    : null;

  const openIssues = issues.filter(i => i.status === 'Open').length;

  return (
    <div className="panel" style={{ animation: 'slideUp 0.4s ease' }}>
      <div className="page-header">
        <h2>💬 Student Feedback &amp; Issues</h2>
        <p>Review ratings, comments, and technical problems reported by students</p>
      </div>

      {/* Exam Selector */}
      <div className="panel-form">
        <h4>Select Exam</h4>
        {examsLoading ? (
          <div className="loading-state"><div className="spinner" /><span>Loading exams…</span></div>
        ) : (
          <select
            value={selectedExam}
            onChange={e => setSelectedExam(e.target.value)}
            style={{ width: '100%', padding: '12px 14px', border: '1.5px solid var(--border-muted)', borderRadius: 'var(--radius-md)', fontSize: '14px', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
          >
            <option value="">— Select an exam —</option>
            {exams.map(exam => (
              <option key={exam._id} value={exam._id}>
                {exam.title} ({new Date(exam.scheduledDate).toLocaleDateString()})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Summary Cards */}
      {selectedExam && !loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div className="stat-card" style={{ textAlign: 'center' }}>
            <div className="stat-card-icon">⭐</div>
            <div className="stat-card-value">{avgRating ?? '—'}</div>
            <div className="stat-card-label">Avg. Rating / 5</div>
          </div>
          <div className="stat-card" style={{ textAlign: 'center' }}>
            <div className="stat-card-icon">💬</div>
            <div className="stat-card-value">{feedbacks.length}</div>
            <div className="stat-card-label">Total Feedbacks</div>
          </div>
          <div className="stat-card" style={{ textAlign: 'center' }}>
            <div className="stat-card-icon">🚨</div>
            <div className="stat-card-value" style={{ color: openIssues > 0 ? 'var(--danger)' : 'var(--success)' }}>{openIssues}</div>
            <div className="stat-card-label">Open Issues</div>
          </div>
          <div className="stat-card" style={{ textAlign: 'center' }}>
            <div className="stat-card-icon">📋</div>
            <div className="stat-card-value">{issues.length}</div>
            <div className="stat-card-label">Total Issues</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      {selectedExam && (
        <div>
          <div style={{ display: 'flex', borderBottom: '2px solid var(--border)', marginBottom: '24px' }}>
            {[
              { key: 'feedback', label: '⭐ Feedback', count: feedbacks.length },
              { key: 'issues', label: '🚨 Issues', count: issues.length }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderBottom: activeTab === tab.key ? '2px solid var(--primary)' : '2px solid transparent',
                  marginBottom: '-2px',
                  background: 'none',
                  color: activeTab === tab.key ? 'var(--primary)' : 'var(--text-secondary)',
                  fontWeight: activeTab === tab.key ? 700 : 500,
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {tab.label}
                <span style={{
                  background: activeTab === tab.key ? 'var(--primary)' : 'var(--border)',
                  color: activeTab === tab.key ? '#fff' : 'var(--text-muted)',
                  borderRadius: '20px',
                  padding: '1px 8px',
                  fontSize: '11px',
                  fontWeight: 700
                }}>{tab.count}</span>
              </button>
            ))}
          </div>

          {loading ? (
            <div className="loading-state"><div className="spinner" /><span>Loading data…</span></div>
          ) : activeTab === 'feedback' ? (
            <FeedbackTab feedbacks={feedbacks} avgRating={avgRating} />
          ) : (
            <IssuesTab issues={issues} onStatusChange={handleStatusChange} updatingId={updatingId} />
          )}
        </div>
      )}

      {!selectedExam && !examsLoading && (
        <div className="empty-state" style={{ padding: '60px 20px' }}>
          <span className="empty-state-icon">💬</span>
          <h4>Select an Exam</h4>
          <p>Choose an exam from the dropdown above to view student feedback and reported issues.</p>
        </div>
      )}
    </div>
  );
};

const FeedbackTab = ({ feedbacks, avgRating }) => {
  if (feedbacks.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-state-icon">⭐</span>
        <h4>No Feedback Yet</h4>
        <p>No students have submitted feedback for this exam.</p>
      </div>
    );
  }

  return (
    <div>
      {avgRating && (
        <div style={{
          padding: '20px 24px',
          borderRadius: 'var(--radius-lg)',
          background: 'linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%)',
          border: '1px solid #fcd34d',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <span style={{ fontSize: '40px' }}>⭐</span>
          <div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#92400e', lineHeight: 1 }}>{avgRating} / 5</div>
            <div style={{ fontSize: '13px', color: '#78350f', marginTop: '4px' }}>Average Rating from {feedbacks.length} student{feedbacks.length !== 1 ? 's' : ''}</div>
          </div>
        </div>
      )}

      <div className="card-list">
        {feedbacks.map(f => (
          <div key={f._id} className="card" style={{ borderLeft: '4px solid #f59e0b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
              <div>
                <h4 style={{ margin: '0 0 2px' }}>{f.studentId?.name || 'Anonymous'}</h4>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>{f.studentId?.email || ''}</p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <StarRating rating={f.rating} />
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {new Date(f.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
            {f.comments ? (
              <div style={{
                background: 'var(--bg-surface-muted)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                fontSize: '14px',
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
                fontStyle: 'italic'
              }}>
                "{f.comments}"
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>No comment provided.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const IssuesTab = ({ issues, onStatusChange, updatingId }) => {
  if (issues.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-state-icon">🛠️</span>
        <h4>No Issues Reported</h4>
        <p>No students have reported any issues for this exam.</p>
      </div>
    );
  }

  return (
    <div className="card-list">
      {issues.map(issue => {
        const style = STATUS_STYLE[issue.status] || STATUS_STYLE['Open'];
        const catIcon = CATEGORY_ICON[issue.category] || '❓';
        const isUpdating = updatingId === issue._id;

        return (
          <div key={issue._id} className="card" style={{
            borderLeft: `4px solid ${issue.status === 'Resolved' ? 'var(--success)' : issue.status === 'In Progress' ? 'var(--warning)' : 'var(--danger)'}`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '24px', flexShrink: 0 }}>{catIcon}</span>
                <div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>{issue.category} Issue</span>
                    <span style={{ padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: style.bg, color: style.color }}>
                      {issue.status}
                    </span>
                  </div>
                  <p style={{ margin: '0 0 4px', fontSize: '13px', color: 'var(--text-muted)' }}>
                    By <strong>{issue.studentId?.name || 'Unknown'}</strong> · {new Date(issue.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div style={{ flexShrink: 0 }}>
                <select
                  value={issue.status}
                  disabled={isUpdating}
                  onChange={e => onStatusChange(issue._id, e.target.value)}
                  style={{
                    padding: '6px 10px',
                    border: '1.5px solid var(--border-muted)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '13px',
                    background: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    cursor: isUpdating ? 'not-allowed' : 'pointer',
                    opacity: isUpdating ? 0.6 : 1
                  }}
                >
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginTop: '12px', padding: '12px 14px', background: 'var(--bg-surface-muted)', borderRadius: 'var(--radius-md)', fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {issue.description}
            </div>

            {issue.screenshotUrl && (
              <div style={{ marginTop: '12px' }}>
                <a
                  href={`http://localhost:5000${issue.screenshotUrl}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--primary-light, #eff6ff)',
                    color: 'var(--primary, #2563eb)',
                    fontSize: '13px',
                    fontWeight: 600,
                    textDecoration: 'none',
                    border: '1px solid var(--primary-light, #bfdbfe)'
                  }}
                >
                  📸 View Screenshot
                </a>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default FeedbackIssues;
