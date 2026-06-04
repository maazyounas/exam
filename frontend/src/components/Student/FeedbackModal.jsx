import { useState } from 'react';
import axios from 'axios';

const FeedbackModal = ({ examId, onClose }) => {
  const [rating, setRating] = useState(0);
  const [comments, setComments] = useState('');
  const [hoverRating, setHoverRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      setError('Please provide a rating');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await axios.post(
        'http://localhost:5000/api/feedback',
        { examId, rating, comments },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit feedback');
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content glass-card" style={{ maxWidth: '500px', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0 }}>Provide Feedback</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '20px' }}>&times;</button>
        </div>

        {success ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
            <h4>Thank you!</h4>
            <p style={{ color: 'var(--text-muted)' }}>Your feedback has been submitted successfully.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && <div className="error-message" style={{ marginBottom: '16px' }}>{error}</div>}
            
            <div className="form-group" style={{ textAlign: 'center', margin: '30px 0' }}>
              <label>How would you rate this exam?</label>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '36px',
                      cursor: 'pointer',
                      color: (hoverRating || rating) >= star ? '#ffd700' : 'var(--bg-surface-hover)',
                      transition: 'color 0.2s',
                      padding: '0 4px'
                    }}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Additional Comments (Optional)</label>
              <textarea
                className="input-field"
                rows="4"
                placeholder="What did you think about the difficulty, clarity, etc.?"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                style={{ resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button type="button" className="button button--secondary" onClick={onClose} disabled={submitting}>
                Cancel
              </button>
              <button type="submit" className="button button--primary btn-gradient" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default FeedbackModal;
