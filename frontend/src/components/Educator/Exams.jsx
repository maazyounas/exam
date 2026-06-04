import { useState, useEffect } from 'react';
import api from '../../lib/api.js';
import EditExamModal from './EditExamModal.jsx';

const getExamStatus = (scheduledDate) => {
  const now = new Date();
  const date = new Date(scheduledDate);
  if (date > now) return { label: 'Scheduled', cls: 'badge--info' };
  if (date <= now && (now - date) < 1000 * 60 * 60 * 3) return { label: 'Active', cls: 'badge--success' };
  return { label: 'Completed', cls: 'badge' };
};

const Exams = () => {
  const [exams, setExams] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('list');
  const [step, setStep] = useState('group');
  const [group, setGroup] = useState({ groupId: '', groupName: '', groupDescription: '', subject: '' });
  const [variantForm, setVariantForm] = useState({ title: '', description: '', scheduledDate: '', duration: '', questions: [] });
  const [questionForm, setQuestionForm] = useState({ questionText: '', subject: '', topic: '', difficulty: 'medium', options: ['', '', '', ''], correctAnswer: '' });
  const [questionLoading, setQuestionLoading] = useState(false);
  const [editQuestionId, setEditQuestionId] = useState(null);
  const [lastSavedVariant, setLastSavedVariant] = useState(null);
  const [variantCount, setVariantCount] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [editingExam, setEditingExam] = useState(null);

  useEffect(() => { refreshData(); }, []);

  const refreshData = async () => {
    setLoading(true);
    try {
      const [e, q] = await Promise.all([
        api.get('/educators/exams'),
        api.get('/educators/questions'),
      ]);
      setExams(e.data); setQuestions(q.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleGroupChange = e => setGroup({ ...group, [e.target.name]: e.target.value });
  const handleVariantChange = e => setVariantForm({ ...variantForm, [e.target.name]: e.target.value });

  const handleQuestionChange = e => {
    const { name, value } = e.target;
    if (name.startsWith('option-')) {
      const opts = [...questionForm.options]; opts[Number(name.split('-')[1])] = value;
      setQuestionForm({ ...questionForm, options: opts }); return;
    }
    setQuestionForm({ ...questionForm, [name]: value });
  };

  const toggleQ = id => setVariantForm(p => ({
    ...p, questions: p.questions.includes(id) ? p.questions.filter(q => q !== id) : [...p.questions, id]
  }));

  const startVariant = e => {
    e.preventDefault();
    if (!group.groupId.trim()) return alert('Exam Group ID is required.');
    setStep('variant');
  };

  const resetVariantForm = () => setVariantForm({ title: '', description: '', scheduledDate: '', duration: '', questions: [] });
  const resetGroupFlow = () => { setGroup({ groupId:'', groupName:'', groupDescription:'', subject:'' }); resetVariantForm(); setLastSavedVariant(null); setVariantCount(0); setStep('group'); setTab('list'); };

  const saveQuestion = async e => {
    e.preventDefault();
    if (!questionForm.questionText || !questionForm.correctAnswer) return alert('Question text and correct answer required.');
    setQuestionLoading(true);
    try {
      if (editQuestionId) await api.put(`/educators/questions/${editQuestionId}`, questionForm);
      else                await api.post('/educators/questions', questionForm);
      setQuestionForm({ questionText:'', subject:'', topic:'', difficulty:'medium', options:['','','',''], correctAnswer:'' });
      setEditQuestionId(null); await refreshData();
    } catch (err) { alert(err.response?.data?.message || 'Failed to save question'); }
    finally { setQuestionLoading(false); }
  };

  const editQuestion = q => {
    setEditQuestionId(q._id);
    setQuestionForm({ questionText:q.questionText||'', subject:q.subject||'', topic:q.topic||'', difficulty:q.difficulty||'medium', options:q.options?.length===4?q.options:['','','',''], correctAnswer:q.correctAnswer||'' });
  };

  const deleteQuestion = async id => {
    if (!window.confirm('Delete this question?')) return;
    setQuestionLoading(true);
    try { await api.delete(`/educators/questions/${id}`); await refreshData(); }
    catch (err) { alert('Failed to delete'); }
    finally { setQuestionLoading(false); }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!variantForm.title || !variantForm.scheduledDate || !variantForm.duration || !variantForm.questions.length)
      return alert('Complete variant details and select at least one question.');
    setLoading(true);
    try {
      const res = await api.post('/educators/exams', { ...variantForm, ...group });
      setLastSavedVariant(res.data); setVariantCount(c => c + 1); resetVariantForm(); await refreshData();
    } catch (err) { alert(err.response?.data?.message || 'Failed to create exam variant'); }
    finally { setLoading(false); }
  };

  const handleDeleteExam = async id => {
    setLoading(true);
    try { await api.delete(`/educators/exams/${id}`); setDeleteConfirm(null); await refreshData(); }
    catch (err) { alert('Failed to delete exam'); }
    finally { setLoading(false); }
  };

  return (
    <div className="panel">
      <div className="page-header">
        <h2>📋 Exams</h2>
        <p>Create exam groups, add variants, and manage your exam catalogue</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid var(--border)', marginBottom: '4px' }}>
        {[{ id: 'list', label: `📑 All Exams (${exams.length})` }, { id: 'create', label: '➕ Create Exam' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: '10px 20px', border: 'none', background: 'transparent', fontWeight: 600, fontSize: '14px', cursor: 'pointer', borderBottom: tab===t.id ? '2px solid var(--primary)' : '2px solid transparent', color: tab===t.id ? 'var(--primary)' : 'var(--text-secondary)', marginBottom: '-2px', transition: 'all 0.2s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* === LIST TAB === */}
      {tab === 'list' && (
        loading ? (
          <div className="loading-state"><div className="spinner" /><span>Loading…</span></div>
        ) : exams.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon">📋</span>
            <h4>No exams yet</h4>
            <p>Click "Create Exam" to build your first exam group.</p>
            <button className="button button--primary" style={{ marginTop: '16px' }} onClick={() => setTab('create')}>➕ Create Exam</button>
          </div>
        ) : (
          <div className="card-list">
            {exams.map(exam => {
              const status = getExamStatus(exam.scheduledDate);
              const isDel = deleteConfirm === exam._id;
              return (
                <div key={exam._id} className="card" style={{ borderLeft: `4px solid var(--primary)` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <div>
                      <h4 style={{ margin: '0 0 6px' }}>{exam.title}</h4>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <span className={`badge ${status.cls}`}>{status.label}</span>
                        <span className="badge">Group: {exam.groupId}</span>
                        {exam.subject && <span className="badge badge--info">{exam.subject}</span>}
                      </div>
                    </div>
                    <span style={{ background: 'var(--bg-accent)', color: 'var(--primary)', borderRadius: 'var(--radius-full)', padding: '4px 12px', fontSize: '13px', fontWeight: 700, flexShrink: 0 }}>
                      {exam.questions.length} Qs
                    </span>
                  </div>
                  {exam.description && <p style={{ marginTop: '10px' }}>{exam.description}</p>}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px' }}>
                    <p><strong>📅 Scheduled:</strong> {new Date(exam.scheduledDate).toLocaleString()}</p>
                    <p><strong>⏱️ Duration:</strong> {exam.duration} min</p>
                    <p><strong>👥 Enrolled:</strong> {exam.enrolledStudents?.length ?? 0} students</p>
                    {exam.groupName && <p><strong>📁 Group:</strong> {exam.groupName}</p>}
                  </div>
                  <div className="card-footer" style={{ display: 'flex', gap: '8px' }}>
                    {status.label !== 'Completed' && !isDel && (
                      <button className="button button--secondary button--sm" onClick={() => setEditingExam(exam)}>✏️ Edit</button>
                    )}
                    {isDel ? (
                      <>
                        <span style={{ fontSize: '13px', color: 'var(--danger)', fontWeight: 600 }}>Confirm delete?</span>
                        <button className="button button--danger button--sm" onClick={() => handleDeleteExam(exam._id)}>Yes, Delete</button>
                        <button className="button button--ghost button--sm" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                      </>
                    ) : (
                      <button className="button button--danger button--sm" onClick={() => setDeleteConfirm(exam._id)}>🗑️ Delete</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* === CREATE TAB === */}
      {tab === 'create' && (
        <div className="panel" style={{ animation: 'slideUp 0.3s ease' }}>

          {/* Step 1 — Group */}
          {step === 'group' ? (
            <div className="panel-form">
              <h4>Step 1 — Exam Group Details</h4>
              <form onSubmit={startVariant}>
                <div className="form-grid">
                  <div className="form-row">
                    <input name="groupId" placeholder="Exam Group ID *" value={group.groupId} onChange={handleGroupChange} required />
                  </div>
                  <div className="form-row">
                    <input name="groupName" placeholder="Group Name (optional)" value={group.groupName} onChange={handleGroupChange} />
                  </div>
                  <div className="form-row">
                    <input name="subject" placeholder="Subject (optional)" value={group.subject} onChange={handleGroupChange} />
                  </div>
                  <div className="form-row">
                    <textarea rows="2" name="groupDescription" placeholder="Group description (optional)" value={group.groupDescription} onChange={handleGroupChange} style={{ resize: 'vertical' }} />
                  </div>
                </div>
                <button type="submit" className="button button--primary" style={{ marginTop: '8px' }}>Next: Add Questions →</button>
              </form>
            </div>
          ) : (
            <div className="panel-form" style={{ background: 'var(--bg-accent)', borderColor: 'rgba(79,70,229,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ margin: '0 0 4px' }}>Group: {group.groupId}</h4>
                  <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>{group.groupName || '—'} {group.subject ? `• ${group.subject}` : ''} • {variantCount} variant(s) created</p>
                </div>
                <button className="button button--ghost button--sm" onClick={resetGroupFlow}>✕ Cancel</button>
              </div>
            </div>
          )}

          {step !== 'group' && (
            <>
              {/* Add / Edit Question */}
              <div className="panel-form">
                <h4>{editQuestionId ? '✏️ Edit Question' : '➕ Add Question to Bank'}</h4>
                <form onSubmit={saveQuestion}>
                  <div className="form-row" style={{ marginBottom: '12px' }}>
                    <textarea rows="2" name="questionText" placeholder="Question text *" value={questionForm.questionText} onChange={handleQuestionChange} required style={{ resize: 'vertical' }} />
                  </div>
                  <div className="form-grid">
                    <div className="form-row"><input name="subject" placeholder="Subject" value={questionForm.subject} onChange={handleQuestionChange} /></div>
                    <div className="form-row"><input name="topic" placeholder="Topic" value={questionForm.topic} onChange={handleQuestionChange} /></div>
                    <div className="form-row">
                      <select name="difficulty" value={questionForm.difficulty} onChange={handleQuestionChange}>
                        <option value="easy">🟢 Easy</option>
                        <option value="medium">🟡 Medium</option>
                        <option value="hard">🔴 Hard</option>
                      </select>
                    </div>
                    <div className="form-row"><input name="correctAnswer" placeholder="Correct answer *" value={questionForm.correctAnswer} onChange={handleQuestionChange} required /></div>
                    {[0,1,2,3].map(i => (
                      <div className="form-row" key={i}><input name={`option-${i}`} placeholder={`Option ${i+1}`} value={questionForm.options[i]} onChange={handleQuestionChange} /></div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                    <button type="submit" className="button button--secondary" disabled={questionLoading} style={{ flex: 1 }}>
                      {questionLoading ? 'Saving…' : editQuestionId ? '💾 Update' : '➕ Save Question'}
                    </button>
                    {editQuestionId && (
                      <button type="button" className="button button--ghost" onClick={() => { setEditQuestionId(null); setQuestionForm({ questionText:'', subject:'', topic:'', difficulty:'medium', options:['','','',''], correctAnswer:'' }); }}>Cancel</button>
                    )}
                  </div>
                </form>
              </div>

              {/* Select questions */}
              <div className="panel-form">
                <h4>Step 2 — Select Questions for this Variant</h4>
                <p style={{ margin: '0 0 12px', fontSize: '14px', color: 'var(--text-secondary)' }}>Selected: <strong>{variantForm.questions.length}</strong></p>
                <div className="question-selector">
                  {questions.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>No questions in bank yet. Add questions above first.</div>
                  ) : questions.map(q => (
                    <label key={q._id} className="question-item">
                      <input type="checkbox" checked={variantForm.questions.includes(q._id)} onChange={() => toggleQ(q._id)} />
                      <span>{q.questionText}</span>
                      <div className="question-actions">
                        <button type="button" className="button button--secondary button--sm" onClick={() => editQuestion(q)}>Edit</button>
                        <button type="button" className="button button--danger button--sm" onClick={() => deleteQuestion(q._id)}>Del</button>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Variant form */}
              <div className="panel-form">
                <h4>Step 3 — Variant Details</h4>
                <form onSubmit={handleSubmit}>
                  <div className="form-grid">
                    <div className="form-row"><input name="title" placeholder="Variant title *" value={variantForm.title} onChange={handleVariantChange} required /></div>
                    <div className="form-row"><input name="scheduledDate" type="datetime-local" value={variantForm.scheduledDate} onChange={handleVariantChange} required /></div>
                    <div className="form-row"><input name="duration" type="number" min="5" placeholder="Duration (minutes) *" value={variantForm.duration} onChange={handleVariantChange} required /></div>
                    <div className="form-row"><input name="description" placeholder="Notes (optional)" value={variantForm.description} onChange={handleVariantChange} /></div>
                  </div>
                  <button type="submit" className="button button--primary" disabled={loading} style={{ marginTop: '12px' }}>
                    {loading ? 'Saving…' : '✅ Finish & Save Variant'}
                  </button>
                </form>
              </div>

              {/* Post-save options */}
              {lastSavedVariant && (
                <div className="panel-form" style={{ background: 'var(--success-light)', borderColor: 'var(--success-border)' }}>
                  <h4 style={{ color: 'var(--success)' }}>✅ Variant Saved: {lastSavedVariant.title}</h4>
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Saved under group <strong>{group.groupId}</strong>. What's next?</p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="button button--primary" onClick={() => { setLastSavedVariant(null); setStep('variant'); }}>➕ Add Another Variant</button>
                    <button className="button button--success" onClick={resetGroupFlow}>✅ Done</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {editingExam && (
        <EditExamModal 
          exam={editingExam}
          questions={questions}
          onClose={() => setEditingExam(null)} 
          onRefresh={refreshData} 
        />
      )}
    </div>
  );
};

export default Exams;
