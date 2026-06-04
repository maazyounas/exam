import { useState, useEffect } from 'react';
import '../../theme/theme.css';

const CameraCheck = ({ onVerified }) => {
  const [status, setStatus] = useState('idle'); // idle, requesting, success, error
  const [errorMessage, setErrorMessage] = useState('');

  const requestPermissions = async () => {
    setStatus('requesting');
    setErrorMessage('');
    
    try {
      // Request Camera Access
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      
      // Stop the stream immediately since we only wanted to verify permission
      stream.getTracks().forEach(track => track.stop());

      // Request Location Access (Optional but good for proctoring)
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          () => {
            setStatus('success');
            setTimeout(() => onVerified(), 1500); // Wait a bit to show success state
          },
          (err) => {
            console.warn('Location access denied or failed, but camera granted. Proceeding.', err);
            setStatus('success');
            setTimeout(() => onVerified(), 1500);
          },
          { timeout: 5000 } // Add timeout to prevent hanging indefinitely
        );
      } else {
        setStatus('success');
        setTimeout(() => onVerified(), 1500);
      }
      
    } catch (err) {
      console.error('Permission error:', err);
      setStatus('error');
      if (err.name === 'NotAllowedError') {
        setErrorMessage('Camera access was denied. Please allow camera access in your browser settings to proceed.');
      } else if (err.name === 'NotFoundError') {
        setErrorMessage('No camera found on this device. A camera is required for exam proctoring.');
      } else {
        setErrorMessage('An error occurred while accessing the camera. Please ensure it is not being used by another application.');
      }
    }
  };

  return (
    <div className="camera-check-container">
      <div className="camera-check-card">
        <div className="camera-check-icon">
          {status === 'idle' && '📷'}
          {status === 'requesting' && <div className="spinner"></div>}
          {status === 'success' && '✅'}
          {status === 'error' && '❌'}
        </div>
        <h2>System Verification Required</h2>
        <p>To ensure exam integrity, we need to verify your camera access before you can proceed to the dashboard.</p>
        
        {status === 'error' && (
          <div className="alert alert-error">
            {errorMessage}
          </div>
        )}

        <div className="camera-check-actions">
          {status !== 'success' && (
            <button 
              className={`button button--primary ${status === 'requesting' ? 'loading' : ''}`}
              onClick={requestPermissions}
              disabled={status === 'requesting'}
            >
              {status === 'requesting' ? 'Verifying...' : 'Grant Access'}
            </button>
          )}
          {status === 'success' && (
            <div className="success-message">Verification Complete. Redirecting...</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CameraCheck;
