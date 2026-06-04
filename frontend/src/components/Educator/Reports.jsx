import { useState, useEffect, useCallback } from 'react';
import api from '../../lib/api.js';
import AnalyticsDashboard from './AnalyticsDashboard.jsx';

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [recollecting, setRecollecting] = useState(null); // { examId, studentId }

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/educators/reports');
      setReports(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const totalStudents = reports.reduce((a, r) => a + r.totalStudents, 0);
  const avgScore = reports.length
    ? (reports.reduce((a, r) => a + r.averageScore, 0) / reports.length).toFixed(1)
    : 0;
  const totalViolations = reports.reduce((a, r) =>
    a + r.results.reduce((b, s) => b + (s.totalViolations || 0), 0), 0);

  const handleExport = (examId, format) => {
    const token = localStorage.getItem('token');
    fetch(`http://localhost:5000/api/reports/export/${examId}?format=${format}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.blob())
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Exam_Report_${examId}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    })
    .catch(err => console.error('Export failed', err));
  };

  const handleRecollect = async (examId, studentMongoId, studentName) => {
    if (!window.confirm(`Recollect exam for ${studentName}? This will delete their submission and allow them to retake the exam.`)) return;
    setRecollecting({ examId, studentId: studentMongoId });
    try {
      await api.delete(`/educators/exams/${examId}/recollect/${studentMongoId}`);
      await fetchReports();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to recollect exam');
    } finally {
      setRecollecting(null);
    }
  };

  return (
    <div className="panel">
      <div className="page-header">
        <h2>📊 Reports</h2>
        <p>Exam performance summaries, violation tracking, and per-student breakdowns</p>
      </div>

      {/* Summary stat cards */}
      {!loading && reports.length > 0 && (
        <div className="stat-cards">
          {[
            { icon: '📋', label: 'Total Exams',       value: reports.length },
            { icon: '👥', label: 'Total Submissions', value: totalStudents },
            { icon: '📈', label: 'Avg Score',         value: `${avgScore}%` },
            { icon: '🚨', label: 'Total Violations',  value: totalViolations, danger: totalViolations > 0 },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <span className="stat-card-icon">{s.icon}</span>
              <div className="stat-card-value" style={s.danger ? { color: 'var(--danger)' } : {}}>{s.value}</div>
              <div className="stat-card-label">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Analytics Dashboard */}
      {!loading && reports.length > 0 && <AnalyticsDashboard />}

      {loading ? (
        <div className="loading-state"><div className="spinner" /><span>Loading reports…</span></div>
      ) : reports.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon">📊</span>
          <h4>No reports yet</h4>
          <p>Reports appear here after students submit exam answers.</p>
        </div>
      ) : (
        <div className="card-list">
          {reports.map(report => {
            const isExpanded = expanded === report.examId;
            const pct = report.averageScore?.toFixed(1);
            const color = report.averageScore >= 70 ? 'var(--success)' : report.averageScore >= 40 ? 'var(--warning)' : 'var(--danger)';
            const reportViolations = report.results.reduce((a, r) => a + (r.totalViolations || 0), 0);

            return (
              <div key={report.examId} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                  <div>
                    <h4 style={{ margin: '0 0 6px' }}>{report.examTitle}</h4>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <span className="badge">👥 {report.totalStudents} students</span>
                      {reportViolations > 0 && (
                        <span className="violation-badge high">🚨 {reportViolations} violations</span>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="button button--secondary button--sm" onClick={() => handleExport(report.examId, 'pdf')}>
                        📄 PDF
                      </button>
                      <button className="button button--secondary button--sm" onClick={() => handleExport(report.examId, 'excel')}>
                        📊 Excel
                      </button>
                    </div>
                    <div style={{ width: 64, height: 64, borderRadius: '50%', border: `4px solid ${color}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-surface-muted)' }}>
                      <span style={{ fontSize: '15px', fontWeight: 800, color, lineHeight: 1 }}>{pct}%</span>
                      <span style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>avg</span>
                    </div>
                  </div>
                </div>

                {report.results.length > 0 && (
                  <div className="card-footer">
                    <button className="button button--secondary button--sm"
                      onClick={() => setExpanded(isExpanded ? null : report.examId)}>
                      {isExpanded ? '▲ Hide Results' : '▼ View Student Results'}
                    </button>
                  </div>
                )}

                {isExpanded && (
                  <div style={{ marginTop: '16px', animation: 'fadeIn 0.25s ease' }}>
                    <div className="table-responsive">
                      <table className="report-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Name</th>
                            <th>Student ID</th>
                            <th>Score</th>
                            <th>%</th>
                            <th>Violations</th>
                            <th>Status</th>
                            <th>Submitted</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.results.map((r, i) => {
                            const isRecollecting = recollecting?.examId === report.examId && recollecting?.studentId === r.studentMongoId;
                            const hasViolations = (r.totalViolations || 0) > 0;
                            return (
                              <tr key={r.resultId} style={{ background: hasViolations ? 'rgba(220,38,38,0.04)' : undefined }}>
                                <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                                <td style={{ fontWeight: 600 }}>{r.studentName}</td>
                                <td>{r.studentId || '—'}</td>
                                <td>{r.score}/{r.totalQuestions}</td>
                                <td>
                                  <span style={{
                                    fontWeight: 700,
                                    color: r.percentage >= 70 ? 'var(--success)' : r.percentage >= 40 ? 'var(--warning)' : 'var(--danger)'
                                  }}>
                                    {r.percentage?.toFixed(1)}%
                                  </span>
                                </td>
                                <td>
                                  {hasViolations ? (
                                    <span className="violation-badge high" style={{ fontSize: '11px' }}>
                                      🚨 {r.totalViolations}
                                    </span>
                                  ) : (
                                    <span className="violation-badge clean" style={{ fontSize: '11px' }}>✅ 0</span>
                                  )}
                                </td>
                                <td>
                                  {r.monitoringStatus && r.monitoringStatus !== 'none' ? (
                                    <span className={`status-badge ${r.monitoringStatus}`}>{r.monitoringStatus}</span>
                                  ) : <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>}
                                </td>
                                <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{new Date(r.submittedAt).toLocaleString()}</td>
                                <td>
                                  {r.studentMongoId && (
                                    <button
                                      className="button button--danger button--sm"
                                      disabled={isRecollecting}
                                      onClick={() => handleRecollect(report.examId, r.studentMongoId, r.studentName)}
                                      title="Delete this student's submission and allow retake"
                                      style={{ whiteSpace: 'nowrap' }}
                                    >
                                      {isRecollecting ? '⏳…' : '🔄 Recollect'}
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Reports;
