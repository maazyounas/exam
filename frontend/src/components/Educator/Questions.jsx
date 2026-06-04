import { useState, useEffect } from 'react';
import api from '../../lib/api.js';

const DIFF_COLORS = {
  easy:   { bg: 'var(--success-light)', color: 'var(--success)' },
  medium: { bg: 'var(--warning-light)', color: 'var(--warning)' },
  hard:   { bg: 'var(--danger-light)',  color: 'var(--danger)'  },
};

const Questions = () => {
  const [questions, setQuestions] = useState([]);
  const [search, setSearch] = useState('');
  const [editId, setEditId] = useState(null);
  const [listLoading, setListLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    questionText: '', subject: '', topic: '', difficulty: 'medium',
    options: ['', '', '', ''], correctAnswer: '', isReusable: true,
  });

  useEffect(() => { refreshQuestions(); }, []);

  const refreshQuestions = async () => {
    setListLoading(true);
    try {
      const res = await api.get('/educators/questions');
      setQuestions(res.data);
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Could not load questions. Is the backend running on port 5000?';
      alert(msg);
    } finally {
      setListLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, checked } = e.target;
    if (name.startsWith('option-')) {
      const idx = parseInt(name.split('-')[1], 10);
      const opts = [...form.options]; opts[idx] = value;
      setForm({ ...form, options: opts }); return;
    }
    if (name === 'isReusable') { setForm({ ...form, isReusable: checked }); return; }
    setForm({ ...form, [name]: value });
  };

  const resetForm = () => {
    setEditId(null);
    setForm({ questionText: '', subject: '', topic: '', difficulty: 'medium', options: ['','','',''], correctAnswer: '', isReusable: true });
  };

  const openForm = () => {
    setShowForm(true);
  };

  const closeForm = () => {
    resetForm();
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editId) await api.put(`/educators/questions/${editId}`, form);
      else await api.post('/educators/questions', form);
      closeForm();
      await refreshQuestions();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to save question');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (q) => {
    setEditId(q._id);
    setForm({ questionText: q.questionText||'', subject: q.subject||'', topic: q.topic||'',
      difficulty: q.difficulty||'medium', options: q.options?.length===4 ? q.options : ['','','',''],
      correctAnswer: q.correctAnswer||'', isReusable: q.isReusable !== false });
    openForm();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this question from the bank?')) return;
    setDeletingId(id);
    try {
      await api.delete(`/educators/questions/${id}`);
      await refreshQuestions();
    } catch (err) {
      const msg = err.response?.data?.message
        || (err.request ? 'Cannot reach server. Start the backend: npm run dev:backend' : 'Failed to delete question');
      alert(msg);
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = questions.filter(q =>
    q.questionText?.toLowerCase().includes(search.toLowerCase()) ||
    q.subject?.toLowerCase().includes(search.toLowerCase()) ||
    q.topic?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="panel">
      <div className="page-header">
        <h2>❓ Question Bank</h2>
        <p>Create and manage your reusable MCQ questions</p>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <input
          style={{ flex: 1, padding: '10px 14px', border: '1.5px solid var(--border-muted)', borderRadius: 'var(--radius-md)', fontSize: '14px' }}
          placeholder="🔍  Search questions by text, subject or topic…"
          value={search} onChange={e => setSearch(e.target.value)}
        />
        <button
          type="button"
          className="button button--primary"
          onClick={() => (showForm ? closeForm() : openForm())}
        >
          {showForm ? '✕ Close' : '＋ New Question'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="panel-form" style={{ animation: 'slideUp 0.3s ease' }}>
          <h4>{editId ? '✏️ Edit Question' : '➕ New Question'}</h4>
          <form onSubmit={handleSubmit}>
            <div className="form-row" style={{ marginBottom: '12px' }}>
              <textarea name="questionText" rows="3" placeholder="Question text *"
                value={form.questionText} onChange={handleChange} required
                style={{ resize: 'vertical' }} />
            </div>
            <div className="form-grid">
              <div className="form-row">
                <input name="subject" placeholder="Subject" value={form.subject} onChange={handleChange} />
              </div>
              <div className="form-row">
                <input name="topic" placeholder="Topic" value={form.topic} onChange={handleChange} />
              </div>
              <div className="form-row">
                <select name="difficulty" value={form.difficulty} onChange={handleChange}>
                  <option value="easy">🟢 Easy</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="hard">🔴 Hard</option>
                </select>
              </div>
              <div className="form-row">
                <input name="correctAnswer" placeholder="Correct answer *" value={form.correctAnswer} onChange={handleChange} required />
              </div>
              {[0,1,2,3].map(i => (
                <div className="form-row" key={i}>
                  <input name={`option-${i}`} placeholder={`Option ${i+1}`} value={form.options[i]} onChange={handleChange} />
                </div>
              ))}
            </div>
            <div className="checkbox-group" style={{ marginTop: '8px' }}>
              <label>
                <input name="isReusable" type="checkbox" checked={form.isReusable} onChange={handleChange} />
                Reusable in question bank
              </label>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button type="submit" className="button button--primary" disabled={saving} style={{ flex: 1 }}>
                {saving ? 'Saving…' : editId ? '💾 Update Question' : '➕ Add Question'}
              </button>
              <button type="button" className="button button--ghost" onClick={closeForm} disabled={saving}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      <div className="panel-form">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4>All Questions ({filtered.length})</h4>
          {search && <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Filtered from {questions.length} total</span>}
        </div>
        {listLoading ? (
          <div className="loading-state"><div className="spinner" /><span>Loading…</span></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon">❓</span>
            <h4>{search ? 'No matching questions' : 'No questions yet'}</h4>
            <p>{search ? 'Try a different search term.' : 'Click "+ New Question" to add your first question.'}</p>
          </div>
        ) : (
          <div className="card-list">
            {filtered.map(q => {
              const dc = DIFF_COLORS[q.difficulty] || DIFF_COLORS.medium;
              return (
                <div key={q._id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <h4 style={{ flex: 1, margin: 0, fontSize: '15px', lineHeight: '1.5' }}>{q.questionText}</h4>
                    <span style={{ padding: '3px 10px', borderRadius: 'var(--radius-full)', fontSize: '12px', fontWeight: 600, background: dc.bg, color: dc.color, flexShrink: 0 }}>
                      {q.difficulty}
                    </span>
                  </div>
                  <div className="card-meta">
                    {q.subject && <span className="badge">{q.subject}</span>}
                    {q.topic   && <span className="badge badge--info">{q.topic}</span>}
                    <span className="badge badge--success">✓ {q.correctAnswer}</span>
                    {q.isReusable && <span className="badge">♻️ Reusable</span>}
                  </div>
                  <div className="card-footer">
                    <button className="button button--secondary button--sm" onClick={() => handleEdit(q)}>✏️ Edit</button>
                    <button
                      className="button button--danger button--sm"
                      onClick={() => handleDelete(q._id)}
                      disabled={deletingId === q._id}
                    >
                      {deletingId === q._id ? 'Deleting…' : '🗑️ Delete'}
                    </button>
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

export default Questions;
