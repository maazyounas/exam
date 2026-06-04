import { useState, useEffect } from 'react';
import api from '../../lib/api.js';

const Monitoring = () => {
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [recollecting, setRecollecting] = useState(null);

  useEffect(() => { fetchExams(); }, []);

  const fetchSessions = async (examId) => {
    setDetailsLoading(true);
    try {
      const res = await api.get(`/monitoring/exam/${examId}`);
      setSessions(res.data);
    } catch (err) { console.error(err); }
    finally { setDetailsLoading(false); }
  };

  const fetchExams = async () => {
    setLoading(true);
    try {
      const res = await api.get('/educators/exams');
      setExams(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSelectExam = async (examId) => {
    setSelectedExam(examId);
    setExpandedId(null);
    await fetchSessions(examId);
  };

  const handleRecollect = async (examId, studentId, studentName) => {
    if (!window.confirm(`Recollect exam for ${studentName}? This will delete their submission and proctoring log, allowing them to retake the exam.`)) return;
    setRecollecting({ examId, studentId });
    try {
      await api.delete(`/educators/exams/${examId}/recollect/${studentId}`);
      await fetchSessions(examId);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to recollect exam');
    } finally {
      setRecollecting(null);
    }
  };

  const getViolationLevel = (count) => {
    if (count === 0) return { label: '✅ Clean', cls: 'violation-badge clean' };
    if (count <= 2)  return { label: `⚠️ ${count} violations`, cls: 'violation-badge low' };
    return               { label: `🚨 ${count} violations`, cls: 'violation-badge high' };
  };

  const getStatusCls = (status) => ({
    active: 'status-badge active',
    completed: 'status-badge completed',
    flagged: 'status-badge flagged',
  }[status] || 'status-badge');

  const selectedExamTitle = exams.find(e => e._id === selectedExam)?.title || '';

  return (
    <div className="panel">
      <div className="page-header">
        <h2>👁️ Proctoring Monitor</h2>
        <p>Review student behaviour and violations during exams</p>
      </div>

      {/* Exam Selector */}
      <div className="panel-form">
        <h4>Select Exam</h4>
        {loading ? (
          <div className="loading-state"><div className="spinner" /><span>Loading exams…</span></div>
        ) : exams.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px' }}>
            <span className="empty-state-icon">📋</span>
            <h4>No exams found</h4>
          </div>
        ) : (
          <select
            value={selectedExam || ''}
            onChange={e => handleSelectExam(e.target.value)}
            style={{ width: '100%', padding: '12px 14px', border: '1.5px solid var(--border-muted)', borderRadius: 'var(--radius-md)', fontSize: '14px', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
          >
            <option value="">— Select an exam —</option>
            {exams.map(exam => (
              <option key={exam._id} value={exam._id}>
                {exam.title}  ({new Date(exam.scheduledDate).toLocaleDateString()})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Sessions */}
      {selectedExam && (
        <div className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0 }}>Sessions — {selectedExamTitle}</h4>
            <span className="badge">{sessions.length} student(s)</span>
          </div>

          {detailsLoading ? (
            <div className="loading-state"><div className="spinner" /><span>Loading monitoring data…</span></div>
          ) : sessions.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">🔍</span>
              <h4>No sessions yet</h4>
              <p>No students have started this exam yet.</p>
            </div>
          ) : (
            <div className="card-list">
              {sessions.map(session => {
                const vLevel = getViolationLevel(session.totalViolations);
                const isExpanded = expandedId === session._id;
                const duration = session.endTime
                  ? `${Math.round((new Date(session.endTime) - new Date(session.startTime)) / 60000)} min`
                  : 'In progress';

                return (
                  <div key={session._id} className="card"
                    style={{ borderLeft: `4px solid ${session.totalViolations === 0 ? 'var(--success)' : session.totalViolations <= 2 ? 'var(--warning)' : 'var(--danger)'}` }}>

                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <div>
                        <h4 style={{ margin: '0 0 4px' }}>{session.student?.name || 'Unknown'}</h4>
                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>{session.student?.email}</p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                        <span className={vLevel.cls}>{vLevel.label}</span>
                        <span className={getStatusCls(session.status)}>
                          {session.status === 'flagged' ? '🚨 Cancelled' : session.status}
                        </span>
                      </div>
                    </div>

                    {/* Stats row */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', margin: '16px 0', padding: '12px', background: 'var(--bg-surface-muted)', borderRadius: 'var(--radius-md)' }}>
                      {[
                        { icon: '🚫', label: 'Tab Switches',  val: session.tabSwitches },
                        { icon: '📍', label: 'Location Chg.', val: session.locationChanges },
                        { icon: '⚫', label: 'Screen Blurs',  val: session.screenBlurs },
                        { icon: '👤', label: 'Face Absent',   val: session.faceAbsences || 0 },
                      ].map(s => (
                        <div key={s.label} style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '18px' }}>{s.icon}</div>
                          <div style={{ fontSize: '18px', fontWeight: 800, color: s.val > 0 ? 'var(--danger)' : 'var(--success)', lineHeight: 1 }}>{s.val}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{s.label}</div>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                      <span>🕐 Started: {new Date(session.startTime).toLocaleTimeString()}</span>
                      <span>⏱️ Duration: {duration}</span>
                    </div>

                    {/* Expand button */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <button className="button button--secondary button--sm"
                        style={{ flex: 1 }}
                        onClick={() => setExpandedId(isExpanded ? null : session._id)}>
                        {isExpanded ? '▲ Hide Timeline' : '▼ View Violation Timeline'}
                      </button>
                      {session.totalViolations > 0 && session.student?._id && (
                        <button
                          className="button button--danger button--sm"
                          disabled={!!(recollecting?.examId === selectedExam && recollecting?.studentId === session.student._id)}
                          onClick={() => handleRecollect(selectedExam, session.student._id, session.student?.name || 'Student')}
                          title="Delete submission and allow student to retake"
                        >
                          {recollecting?.examId === selectedExam && recollecting?.studentId === session.student._id ? '⏳…' : '🔄 Recollect'}
                        </button>
                      )}
                    </div>

                    {/* Timeline */}
                    {isExpanded && (
                      <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)', animation: 'fadeIn 0.25s ease' }}>
                        <h5 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Violation Timeline</h5>

                        {session.violations?.length > 0 ? (
                          <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {session.violations.map((v, idx) => (
                              <div key={idx} className="violation-item">
                                <strong>{v.type.replace(/_/g, ' ').toUpperCase()}</strong>
                                <span style={{ marginLeft: '8px' }}>— {new Date(v.timestamp).toLocaleTimeString()}</span>
                                {v.details?.message && <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '12px' }}>{v.details.message}</p>}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No violations recorded.</p>
                        )}

                        {session.initialLocation && (
                          <div style={{ marginTop: '12px', padding: '12px', background: 'var(--info-light)', borderRadius: 'var(--radius-md)', fontSize: '13px' }}>
                            <strong>📍 Initial Location</strong>
                            <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)' }}>
                              Lat: {session.initialLocation.latitude?.toFixed(5)}, Lng: {session.initialLocation.longitude?.toFixed(5)}, ±{session.initialLocation.accuracy?.toFixed(0)}m
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Monitoring;
