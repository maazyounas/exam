import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api.js';
import ExamMonitor from './ExamMonitor.jsx';

const TakeExam = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [violationCount, setViolationCount] = useState(0);
  const [violationSubmitMessage, setViolationSubmitMessage] = useState('');
  const [timeTracker, setTimeTracker] = useState({});
  const [examStarted, setExamStarted] = useState(false);
  // Controls ExamMonitor: true = monitoring on, false = shut everything down
  const [monitoringActive, setMonitoringActive] = useState(true);

  // Verification States
  const [permissionsVerified, setPermissionsVerified] = useState(false);
  const [verifyingPermissions, setVerifyingPermissions] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState({ camera: 'idle', location: 'idle' });
  const [permissionError, setPermissionError] = useState('');

  useEffect(() => {
    fetchExam();
  }, [id]);

  // Countdown timer
  useEffect(() => {
    if (exam && timeLeft > 0 && examStarted) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [exam, timeLeft, examStarted]);

  // Track time spent per question
  useEffect(() => {
    if (exam && !submitting && examStarted && exam.questions && exam.questions.length > 0) {
      const timer = setInterval(() => {
        const qId = exam.questions[currentQuestion]._id;
        setTimeTracker(prev => ({
          ...prev,
          [qId]: (prev[qId] || 0) + 1
        }));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [exam, currentQuestion, submitting, examStarted]);

  const fetchExam = async () => {
    try {
      const res = await api.get(`/students/exam/${id}`);
      setExam(res.data);
      setTimeLeft(res.data.duration * 60);
      const initialAnswers = {};
      res.data.questions.forEach(q => { initialAnswers[q._id] = ''; });
      setAnswers(initialAnswers);
    } catch (err) {
      console.error('Failed to fetch exam:', err);
      setError(err.response?.data?.message || 'Failed to load exam');
    } finally {
      setLoading(false);
    }
  };

  const requestPermissions = async () => {
    setVerifyingPermissions(true);
    setPermissionError('');
    setPermissionStatus({ camera: 'requesting', location: 'requesting' });

    let cameraGranted = false;
    let locationGranted = false;

    // 1. Request Camera
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      cameraGranted = true;
      setPermissionStatus(prev => ({ ...prev, camera: 'success' }));
    } catch (err) {
      console.error('Camera permission denied or failed:', err);
      setPermissionStatus(prev => ({ ...prev, camera: 'denied' }));
      setPermissionError('Camera access is required for proctoring. Please allow camera access in browser settings.');
      setVerifyingPermissions(false);
      return;
    }

    // 2. Request Location
    if (navigator.geolocation) {
      try {
        await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              locationGranted = true;
              setPermissionStatus(prev => ({ ...prev, location: 'success' }));
              resolve(position);
            },
            (err) => {
              reject(err);
            },
            { timeout: 8000 }
          );
        });
      } catch (err) {
        console.error('Location permission denied or failed:', err);
        setPermissionStatus(prev => ({ ...prev, location: 'denied' }));
        setPermissionError('Location access is required for proctoring. Please allow location access in browser settings.');
        setVerifyingPermissions(false);
        return;
      }
    } else {
      setPermissionStatus(prev => ({ ...prev, location: 'denied' }));
      setPermissionError('Geolocation is not supported by this browser. A compatible browser is required.');
      setVerifyingPermissions(false);
      return;
    }

    if (cameraGranted && locationGranted) {
      setPermissionsVerified(true);
    }
    setVerifyingPermissions(false);
  };

  const handleAnswerChange = (questionId, answer) => {
    setAnswers({ ...answers, [questionId]: answer });
  };

  const handleNext = () => {
    if (currentQuestion < exam.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handleSubmit = async (isViolation = false) => {
    if (submitting || submitted) return;
    setSubmitting(true);
    // ← Immediately stop camera / location / all monitoring resources
    setMonitoringActive(false);
    try {
      await api.post(`/students/submit/${id}`, { answers, timeTracker, cancelledDueToViolation: isViolation });
      setSubmitted(true);
      navigate('/student/results');
    } catch (err) {
      console.error('Failed to submit exam:', err);
      if (!isViolation) {
        setMonitoringActive(true);
        alert('Failed to submit exam. Please try again.');
      } else {
        setSubmitted(true);
        navigate('/student/results');
      }
      setSubmitting(false);
    }
  };

  const handleViolation = (count, type) => {
    setViolationCount(count);
    // Prevent cascading triggers if already submitting
    if (submitting || submitted) return;
    if ((type === 'tab_switch' || type === 'screen_blur' || type === 'face_absence') && !submitting) {
      const msg = `Violation detected (${type.replace(/_/g, ' ')}). Your exam has been cancelled and is being automatically submitted.`;
      setViolationSubmitMessage(msg);
      handleSubmit(true);
    } else if (count > 5 && !submitting) {
      const msg = 'Too many violations detected. Your exam has been cancelled and is being automatically submitted.';
      setViolationSubmitMessage(msg);
      handleSubmit(true);
    }
  };

  // ─── Render guards ───────────────────────────────────────────────────────────

  if (loading) return <div className="panel"><p>Loading exam...</p></div>;

  if (error) {
    return (
      <div className="instructions-container">
        <div className="instructions-card" style={{ textAlign: 'center', padding: '60px 40px' }}>
          <div className="camera-check-icon" style={{ fontSize: '64px', marginBottom: '24px' }}>🛑</div>
          <h2 style={{ color: 'var(--text-primary)', marginBottom: '16px' }}>Access Denied</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '18px', marginBottom: '32px' }}>{error}</p>
          <button className="button button--primary" style={{ padding: '12px 32px', fontSize: '16px' }} onClick={() => navigate('/student/exams')}>
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!exam) return <div className="panel"><p>Exam not found.</p></div>;

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ─── Pre-exam instructions screen ───────────────────────────────────────────

  if (!examStarted) {
    return (
      <div className="instructions-container">
        <div className="instructions-card">
          <div className="instructions-header">
            <h2>{exam.title}</h2>
            <div className="badge badge-duration">{exam.duration} Minutes</div>
          </div>

          <div className="instructions-content">
            <h3>Exam Rules &amp; Proctoring Guidelines</h3>
            <p className="subtitle">Please read the following instructions carefully. Your session will be monitored to ensure academic integrity.</p>

            <ul className="rules-list">
              <li>
                <span className="icon">📷</span>
                <div>
                  <strong>Camera &amp; Face Detection</strong>
                  <p>Your camera must remain on throughout the exam. Ensure your face is clearly visible and well-lit.</p>
                </div>
              </li>
              <li>
                <span className="icon">🛑</span>
                <div>
                  <strong>Do Not Switch Tabs</strong>
                  <p>Navigating away from the exam window or switching tabs is strictly prohibited and will be logged.</p>
                </div>
              </li>
              <li>
                <span className="icon">📍</span>
                <div>
                  <strong>Location Tracking</strong>
                  <p>Your location is verified at the start. Moving significantly during the exam may trigger an alert.</p>
                </div>
              </li>
              <li>
                <span className="icon">⚠️</span>
                <div>
                  <strong>Violations</strong>
                  <p>Severe or multiple violations (e.g., covering camera, opening other apps) will result in automatic submission of your exam.</p>
                </div>
              </li>
            </ul>

            <div className="proctoring-check-card" style={{
              background: 'var(--bg-surface-muted)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              marginTop: '24px',
              textAlign: 'left'
            }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '18px', color: 'var(--text-primary)' }}>🔐 Proctored System Check</h3>
              <p style={{ margin: '0 0 16px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                To ensure exam integrity, please allow all required permissions (Webcam & Location).
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'white', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '14px', fontWeight: '500' }}>📷 Camera permission</span>
                  <span className={`badge ${
                    permissionStatus.camera === 'success' ? 'badge--success' : 
                    permissionStatus.camera === 'denied' ? 'badge--danger' : 'badge--info'
                  }`}>
                    {permissionStatus.camera === 'success' ? 'Granted ✅' : 
                     permissionStatus.camera === 'denied' ? 'Denied ❌' : 
                     permissionStatus.camera === 'requesting' ? 'Checking...' : 'Pending ⏳'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'white', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '14px', fontWeight: '500' }}>📍 Location permission</span>
                  <span className={`badge ${
                    permissionStatus.location === 'success' ? 'badge--success' : 
                    permissionStatus.location === 'denied' ? 'badge--danger' : 'badge--info'
                  }`}>
                    {permissionStatus.location === 'success' ? 'Granted ✅' : 
                     permissionStatus.location === 'denied' ? 'Denied ❌' : 
                     permissionStatus.location === 'requesting' ? 'Checking...' : 'Pending ⏳'}
                  </span>
                </div>
              </div>

              {permissionError && (
                <div className="alert alert-error" style={{ marginBottom: '16px', padding: '12px 14px', fontSize: '13px' }}>
                  ⚠️ {permissionError}
                </div>
              )}

              {!permissionsVerified ? (
                <button 
                  className={`button button--primary button--full-width ${verifyingPermissions ? 'loading' : ''}`}
                  onClick={requestPermissions}
                  disabled={verifyingPermissions}
                  style={{ padding: '12px' }}
                >
                  {verifyingPermissions ? 'Detecting and Requesting Permissions...' : '🔍 Allow & Verify System Permissions'}
                </button>
              ) : (
                <div className="success-message" style={{ background: 'var(--success-light)', border: '1px solid var(--success-border)', borderRadius: 'var(--radius-md)', padding: '12px', fontSize: '14px', fontWeight: '600', color: 'var(--success)' }}>
                  ✅ All system verification parameters passed successfully! Ready to start.
                </div>
              )}
            </div>

            <div className="good-luck-message" style={{ marginTop: '24px' }}>
              <h3>Do your best!</h3>
              <p>Take a deep breath and start when you are ready.</p>
            </div>
          </div>

          <div className="instructions-footer">
            <button className="button button--secondary" onClick={() => navigate('/student/exams')}>
              Cancel
            </button>
            <button 
              className="button button--primary button--start-exam" 
              onClick={() => setExamStarted(true)}
              disabled={!permissionsVerified}
              style={{
                background: permissionsVerified ? 'var(--gradient-brand)' : 'var(--border-muted)',
                cursor: permissionsVerified ? 'pointer' : 'not-allowed'
              }}
            >
              🚀 Start Exam
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Active exam screen ──────────────────────────────────────────────────────

  const question = exam.questions[currentQuestion];

  if (submitting && violationSubmitMessage) {
    return (
      <div className="instructions-container">
        <div className="instructions-card" style={{ textAlign: 'center', padding: '60px 40px', border: '2px solid var(--danger)' }}>
          <div className="camera-check-icon" style={{ fontSize: '64px', marginBottom: '24px' }}>⚠️</div>
          <h2 style={{ color: 'var(--danger)', marginBottom: '16px' }}>Exam Cancelled</h2>
          <p style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>{violationSubmitMessage}</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>Please wait while your exam is being submitted...</p>
          <div className="spinner" style={{ margin: '32px auto 0' }}></div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ExamMonitor receives `active` prop — set to false on submit to release all resources */}
      <ExamMonitor examId={id} onViolation={handleViolation} active={monitoringActive} />

      <div className="panel">
        <div className="exam-header">
          <h3>{exam.title}</h3>
          <div className="timer">Time Left: {formatTime(timeLeft)}</div>
          <div className="progress">Question {currentQuestion + 1} of {exam.questions.length}</div>
          <div style={{ color: '#d32f2f', fontSize: '12px', marginTop: '5px', fontWeight: 'bold' }}>
            ⚠️ Forward navigation only. You cannot return to previous questions once you move next.
          </div>
          {violationCount > 0 && (
            <div style={{ color: violationCount > 5 ? '#f44336' : '#ff9800', marginTop: '10px', fontWeight: 'bold' }}>
              ⚠️ Violations Detected: {violationCount}
            </div>
          )}
        </div>

        <div className="question-card">
          <h4>{question.questionText}</h4>
          <div className="options">
            {question.options.map((option, index) => (
              <label key={index} className="option">
                <input
                  type="radio"
                  name={`question-${question._id}`}
                  value={option}
                  checked={answers[question._id] === option}
                  onChange={() => handleAnswerChange(question._id, option)}
                />
                {option}
              </label>
            ))}
          </div>
        </div>

        <div className="exam-footer" style={{ justifyContent: 'flex-end' }}>
          {currentQuestion < exam.questions.length - 1 ? (
            <button className="button button--primary" onClick={handleNext}>
              Next Question
            </button>
          ) : (
            <button
              className="button button--success"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Exam'}
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default TakeExam;
