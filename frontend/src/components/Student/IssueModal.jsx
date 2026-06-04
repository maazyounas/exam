import { useState, useRef } from 'react';
import axios from 'axios';

const IssueModal = ({ examId, onClose }) => {
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!category || !description) {
      setError('Category and description are required');
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('examId', examId);
      formData.append('category', category);
      formData.append('description', description);
      if (file) {
        formData.append('screenshot', file);
      }

      await axios.post(
        'http://localhost:5000/api/issues',
        formData,
        { 
          headers: { 
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'multipart/form-data'
          } 
        }
      );
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit issue report');
      setSubmitting(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }
      setFile(selected);
      setError(null);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content glass-card" style={{ maxWidth: '500px', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0 }}>Report an Issue</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '20px' }}>&times;</button>
        </div>

        {success ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🛠️</div>
            <h4>Report Submitted!</h4>
            <p style={{ color: 'var(--text-muted)' }}>Thank you. Our technical team will review the issue shortly.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && <div className="error-message" style={{ marginBottom: '16px' }}>{error}</div>}
            
            <div className="form-group">
              <label>Issue Category *</label>
              <select 
                className="input-field" 
                value={category} 
                onChange={(e) => setCategory(e.target.value)}
                required
              >
                <option value="" disabled>Select a category...</option>
                <option value="Technical">Technical (Platform bug, loading error)</option>
                <option value="Content">Content (Mistake in question/answers)</option>
                <option value="Accessibility">Accessibility (Hard to read, navigation issue)</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-group" style={{ marginTop: '16px' }}>
              <label>Description *</label>
              <textarea
                className="input-field"
                rows="4"
                placeholder="Please describe the issue in detail..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                style={{ resize: 'vertical' }}
              />
            </div>

            <div className="form-group" style={{ marginTop: '16px' }}>
              <label>Screenshot (Optional)</label>
              <div 
                style={{
                  border: '2px dashed var(--border)',
                  borderRadius: '8px',
                  padding: '20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: 'var(--bg-surface-muted)',
                  transition: 'border-color 0.2s',
                  marginTop: '8px'
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                {file ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span>🖼️ {file.name}</span>
                    <button 
                      type="button" 
                      onClick={(e) => { e.stopPropagation(); setFile(null); }}
                      style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                    >
                      &times;
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>📸</div>
                    <div style={{ color: 'var(--text-secondary)' }}>Click to upload screenshot</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>PNG, JPG up to 5MB</div>
                  </div>
                )}
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/jpeg, image/png" 
                style={{ display: 'none' }} 
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button type="button" className="button button--secondary" onClick={onClose} disabled={submitting}>
                Cancel
              </button>
              <button type="submit" className="button button--primary btn-gradient" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default IssueModal;
