import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api.js';

const getCountdown = (scheduledDate) => {
  const diff = new Date(scheduledDate) - new Date();
  if (diff <= 0) return null;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 24) return `Starts in ${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0) return `Starts in ${h}h ${m}m`;
  return `Starts in ${m}m`;
};

const Exams = () => {
  const [exams, setExams] = useState([]);
  const [examCode, setExamCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    fetchExams();
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchExams = async () => {
    setLoading(true);
    try {
      const res = await api.get('/students/exams');
      setExams(res.data);
    } catch (err) { console.error('Failed to fetch exams:', err); }
    finally { setLoading(false); }
  };

  const handleJoin = async (e) => {
    e.preventDefault(); setJoining(true);
    try {
      await api.post('/students/join', { examCode: examCode.trim() });
      setExamCode('');
      await fetchExams();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to join exam');
    } finally { setJoining(false); }
  };

  return (
    <div className="panel">
      <div className="page-header">
        <h2>📋 My Exams</h2>
        <p>View your enrolled exams and join new ones with an exam code</p>
      </div>

      {/* Join exam */}
      <div className="panel-form">
        <h4>🔑 Join an Exam</h4>
        <p style={{ margin: '0 0 16px', fontSize: '14px', color: 'var(--text-secondary)' }}>
          Enter the <strong>group ID</strong> your educator shared (e.g. GRP-ABC123).
        </p>
        <form onSubmit={handleJoin} style={{ display: 'flex', gap: '10px' }}>
          <input
            placeholder="Enter group ID…"
            value={examCode}
            onChange={e => setExamCode(e.target.value)}
            required
            style={{ flex: 1, padding: '12px 14px', border: '1.5px solid var(--border-muted)', borderRadius: 'var(--radius-md)', fontSize: '14px' }}
          />
          <button type="submit" className="button button--primary" disabled={joining}>
            {joining ? 'Joining…' : '➕ Join'}
          </button>
        </form>
      </div>

      {/* Exam list */}
      <div className="panel-form">
        <h4>Enrolled Exams ({exams.length})</h4>
        {loading ? (
          <div className="loading-state"><div className="spinner" /><span>Loading…</span></div>
        ) : exams.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon">📋</span>
            <h4>No exams yet</h4>
            <p>Use the exam code from your educator to join an exam.</p>
          </div>
        ) : (
          <div className="card-list">
            {exams.map(exam => {
              const countdown = getCountdown(exam.scheduledDate);
              const isReady = !countdown;
              return (
                <div key={exam._id} className="card" style={{ borderLeft: `4px solid ${isReady ? 'var(--success)' : 'var(--primary)'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <h4 style={{ margin: 0 }}>{exam.title}</h4>
                    {countdown ? (
                      <span className="badge badge--info">⏰ {countdown}</span>
                    ) : (
                      <span className="badge badge--success">🟢 Ready</span>
                    )}
                  </div>

                  {exam.description && <p style={{ marginTop: '8px' }}>{exam.description}</p>}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', margin: '12px 0' }}>
                    <p style={{ margin: 0 }}><strong>📅 Scheduled:</strong> {new Date(exam.scheduledDate).toLocaleString()}</p>
                    <p style={{ margin: 0 }}><strong>⏱️ Duration:</strong> {exam.duration} min</p>
                    <p style={{ margin: 0 }}><strong>👨‍🏫 Teacher:</strong> {exam.educator?.name || 'Unknown'}</p>
                    {exam.examCode && <p style={{ margin: 0 }}><strong>🔑 Code:</strong> {exam.examCode}</p>}
                  </div>

                  <div className="card-footer">
                    {isReady ? (
                      <Link to={`/student/take-exam/${exam._id}`} className="button button--primary">
                        🚀 Start Exam
                      </Link>
                    ) : (
                      <button className="button button--secondary" disabled title="Exam not yet started">
                        🔒 Not Yet Available
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Exams;
