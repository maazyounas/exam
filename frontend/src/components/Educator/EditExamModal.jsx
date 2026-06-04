import { useState, useEffect } from 'react';
import api from '../../lib/api.js';

const EditExamModal = ({ exam, questions = [], onClose, onRefresh }) => {
  const [form, setForm] = useState({
    title: '',
    description: '',
    scheduledDate: '',
    duration: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedQuestions, setSelectedQuestions] = useState([]);

  useEffect(() => {
    if (exam) {
      // Format datetime-local string (YYYY-MM-DDThh:mm)
      const d = new Date(exam.scheduledDate);
      const isoString = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      
      setForm({
        title: exam.title || '',
        description: exam.description || '',
        scheduledDate: isoString,
        duration: exam.duration || '',
      });
      setSelectedQuestions(
        (exam.questions || []).map((q) => (typeof q === 'object' && q?._id ? String(q._id) : String(q)))
      );
    }
  }, [exam]);

  const toggleQ = (id) => {
    const sid = String(id);
    setSelectedQuestions((prev) =>
      prev.includes(sid) ? prev.filter((q) => q !== sid) : [...prev, sid]
    );
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    if (selectedQuestions.length === 0) {
      setError('Please select at least one question.');
      setLoading(false);
      return;
    }

    try {
      await api.put(`/educators/exams/${exam._id}`, {
        ...exam, 
        ...form,
        questions: selectedQuestions
      });
      onRefresh();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update exam');
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content glass-card" style={{ maxWidth: '500px', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0 }}>✏️ Edit Exam</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '20px' }}>&times;</button>
        </div>

        {error && <div className="error-message" style={{ marginBottom: '16px' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Exam Title *</label>
            <input 
              name="title" 
              className="input-field" 
              value={form.title} 
              onChange={handleChange} 
              required 
            />
          </div>

          <div className="form-group" style={{ marginTop: '16px' }}>
            <label>Scheduled Date & Time *</label>
            <input 
              name="scheduledDate" 
              type="datetime-local" 
              className="input-field" 
              value={form.scheduledDate} 
              onChange={handleChange} 
              required 
            />
          </div>

          <div className="form-group" style={{ marginTop: '16px' }}>
            <label>Duration (minutes) *</label>
            <input 
              name="duration" 
              type="number" 
              min="5" 
              className="input-field" 
              value={form.duration} 
              onChange={handleChange} 
              required 
            />
          </div>

          <div className="form-group" style={{ marginTop: '16px' }}>
            <label>Description (Optional)</label>
            <textarea 
              name="description" 
              className="input-field" 
              rows="3" 
              value={form.description} 
              onChange={handleChange} 
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className="form-group" style={{ marginTop: '16px' }}>
            <label>Questions ({selectedQuestions.length} selected) *</label>
            <div className="question-selector" style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '4px', padding: '8px', background: 'var(--bg-surface)' }}>
              {questions.length === 0 ? (
                <div style={{ color: 'var(--text-muted)' }}>No questions available.</div>
              ) : (
                questions.map(q => (
                  <label key={q._id} className="question-item" style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '8px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}>
                    <input 
                      type="checkbox" 
                      style={{ marginTop: '4px' }}
                      checked={selectedQuestions.includes(String(q._id))} 
                      onChange={() => toggleQ(q._id)} 
                    />
                    <span style={{ fontSize: '13px', lineHeight: 1.4 }}>{q.questionText}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button type="button" className="button button--secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="button button--primary btn-gradient" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditExamModal;
