import { useState, useEffect } from 'react';
import api from '../../lib/api.js';
import FeedbackModal from './FeedbackModal.jsx';
import IssueModal from './IssueModal.jsx';

const ScoreRing = ({ pct }) => {
  const color = pct >= 70 ? 'var(--success)' : pct >= 40 ? 'var(--warning)' : 'var(--danger)';
  return (
    <div style={{
      width: 80, height: 80, borderRadius: '50%',
      border: `6px solid ${color}`,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-surface)', flexShrink: 0,
      boxShadow: `0 0 0 3px ${color}22`,
    }}>
      <span style={{ fontSize: '20px', fontWeight: 800, color, lineHeight: 1 }}>{pct}%</span>
    </div>
  );
};

const Results = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [feedbackExamId, setFeedbackExamId] = useState(null);
  const [issueExamId, setIssueExamId] = useState(null);

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      try {
        const res = await api.get('/students/results');
        setResults(res.data);
      } catch (err) { console.error('Failed to fetch results:', err); }
      finally { setLoading(false); }
    };
    fetchResults();
  }, []);

  const avg = results.length
    ? Math.round(results.reduce((a, r) => a + ((r.score / r.totalQuestions) * 100), 0) / results.length)
    : 0;

  return (
    <div className="panel">
      <div className="page-header">
        <h2>🏆 Results</h2>
        <p>Your exam history and detailed performance breakdowns</p>
      </div>

      {/* Summary */}
      {!loading && results.length > 0 && (
        <div className="stat-cards">
          {[
            { icon: '📝', label: 'Exams Taken',  value: results.length },
            { icon: '📈', label: 'Average Score', value: `${avg}%` },
            { icon: '✅', label: 'Best Score',    value: `${Math.max(...results.map(r => Math.round((r.score / r.totalQuestions) * 100)))}%` },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <span className="stat-card-icon">{s.icon}</span>
              <div className="stat-card-value">{s.value}</div>
              <div className="stat-card-label">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="loading-state"><div className="spinner" /><span>Loading results…</span></div>
      ) : results.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon">🏆</span>
          <h4>No results yet</h4>
          <p>Complete an exam to see your results here.</p>
        </div>
      ) : (
        <div className="results-list">
          {results.map(result => {
            const pct = Math.round((result.score / result.totalQuestions) * 100);
            const isExpanded = expandedId === result._id;
            return (
              <div key={result._id} className="result-card">
                <div className="result-card-header">
                  <div>
                    <h4 style={{ margin: '0 0 6px', fontSize: '16px' }}>{result.exam?.title}</h4>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                      Submitted: {new Date(result.submittedAt).toLocaleString()}
                    </p>
                    <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                      <span className={`badge ${pct >= 70 ? 'badge--success' : pct >= 40 ? 'badge--warning' : 'badge--danger'}`}>
                        {pct >= 70 ? '🎉 Passed' : pct >= 40 ? '⚠️ Average' : '❌ Needs Work'}
                      </span>
                      <span className="badge">{result.score}/{result.totalQuestions} correct</span>
                    </div>
                  </div>
                  <ScoreRing pct={pct} />
                </div>

                <div className="result-card-actions" style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                  {result.answers?.length > 0 && (
                    <button
                      className="button button--secondary"
                      style={{ flex: 1 }}
                      onClick={() => setExpandedId(isExpanded ? null : result._id)}
                    >
                      {isExpanded ? '▲ Hide Breakdown' : '▼ View Question Breakdown'}
                    </button>
                  )}
                  <button 
                    className="button button--secondary"
                    style={{ padding: '8px 12px' }}
                    title="Provide Feedback"
                    onClick={() => setFeedbackExamId(result.exam?._id)}
                  >
                    ⭐
                  </button>
                  <button 
                    className="button button--secondary"
                    style={{ padding: '8px 12px' }}
                    title="Report an Issue"
                    onClick={() => setIssueExamId(result.exam?._id)}
                  >
                    ⚠️
                  </button>
                </div>

                {isExpanded && (
                  <div className="result-details-panel">
                    <h5 style={{ margin: '0 0 16px', fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Question Breakdown
                    </h5>
                    <div className="question-breakdown-list">
                      {result.answers.map((ans, idx) => {
                        const isCorrect = ans.answer === ans.question?.correctAnswer;
                        return (
                          <div key={idx} className={`question-breakdown-item ${isCorrect ? 'correct' : 'incorrect'}`}>
                            <div className="qb-header">
                              <span className="qb-number">Q{idx + 1}</span>
                              <span className="qb-icon">{isCorrect ? '✅' : '❌'}</span>
                            </div>
                            <div className="qb-content">
                              <p className="qb-text">{ans.question?.questionText}</p>
                              <div className="qb-answers">
                                <div className={`qb-answer-row ${isCorrect ? 'correct-text' : 'incorrect-text'}`}>
                                  <strong>Your Answer:</strong> {ans.answer || <em>(No answer)</em>}
                                </div>
                                {!isCorrect && (
                                  <div className="qb-answer-row correct-text">
                                    <strong>Correct Answer:</strong> {ans.question?.correctAnswer}
                                  </div>
                                )}
                                {ans.timeSpent > 0 && (
                                  <div className="qb-answer-row" style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                                    ⏱️ Time spent: {ans.timeSpent}s
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {feedbackExamId && <FeedbackModal examId={feedbackExamId} onClose={() => setFeedbackExamId(null)} />}
      {issueExamId && <IssueModal examId={issueExamId} onClose={() => setIssueExamId(null)} />}
    </div>
  );
};

export default Results;
