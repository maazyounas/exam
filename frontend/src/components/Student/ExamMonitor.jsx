import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../lib/api.js';
import * as faceapi from '@vladmandic/face-api';
import '../../theme/theme.css';

const ExamMonitor = ({ examId, onViolation, active }) => {
  // ─── UI state ────────────────────────────────────────────────────────────────
  const [statusText, setStatusText]         = useState('Starting...');
  const [cameraStatus, setCameraStatus]     = useState('loading'); // loading | ok | blocked
  const [locationStatus, setLocationStatus] = useState('loading'); // loading | ok | denied
  const [faceDetected, setFaceDetected]     = useState(true);
  const [violations, setViolations]         = useState([]);
  const [lastWarning, setLastWarning]       = useState('');
  const [warningVisible, setWarningVisible] = useState(false);
  const [shutDown, setShutDown]             = useState(false);
  const [faceModelsLoaded, setFaceModelsLoaded] = useState(false);

  // ─── Mutable refs (never trigger re-render) ──────────────────────────────────
  const activeRef          = useRef(true);   // mirrors `active` prop without re-renders
  const sessionStarted     = useRef(false);  // backend /monitoring/start called
  const watchIdRef         = useRef(null);
  const videoRef           = useRef(null);
  const streamRef          = useRef(null);
  const warningTimerRef    = useRef(null);
  const faceIntervalRef    = useRef(null);
  const initialLocationRef = useRef(null);
  const violationLockRef   = useRef(false);  // per-violation 500ms debounce
  const violationCountRef  = useRef(0);      // running total (no state re-render delay)
  const faceGraceRef       = useRef(0);      // consecutive "no face" frames before logging

  // ─── Keep activeRef in sync with prop ────────────────────────────────────────
  useEffect(() => {
    activeRef.current = active;
    if (active === false) {
      doShutdown();
    }
  }, [active]);

  // ─── Show a warning banner ────────────────────────────────────────────────────
  const showWarning = useCallback((msg) => {
    setLastWarning(msg);
    setWarningVisible(true);
    clearTimeout(warningTimerRef.current);
    warningTimerRef.current = setTimeout(() => setWarningVisible(false), 4000);
  }, []);

  // ─── Log violation to backend + call parent ───────────────────────────────────
  const logViolation = useCallback(async (endpoint, payload, type) => {
    if (!activeRef.current || violationLockRef.current) return;
    violationLockRef.current = true;
    try {
      const res = await api.post(endpoint, { examId, ...payload });
      const total = res.data?.totalViolations ?? violationCountRef.current + 1;
      violationCountRef.current = total;
      setViolations(prev => [...prev, { type, ts: new Date() }]);
      if (onViolation) onViolation(total, type);
    } catch (err) {
      console.error(`[ExamMonitor] Failed to log ${type}:`, err);
    } finally {
      setTimeout(() => { violationLockRef.current = false; }, 500);
    }
  }, [examId, onViolation]);

  // ─── Shutdown — stop all resources ───────────────────────────────────────────
  const doShutdown = useCallback(async () => {
    activeRef.current = false;

    // Stop geolocation
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    // Stop face detection interval
    if (faceIntervalRef.current) {
      clearInterval(faceIntervalRef.current);
      faceIntervalRef.current = null;
    }

    // Stop camera
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    clearTimeout(warningTimerRef.current);

    // Notify backend
    try {
      await api.post('/monitoring/end', { examId });
    } catch (e) {
      console.warn('[ExamMonitor] Could not call /monitoring/end:', e.message);
    }

    setShutDown(true);
    setStatusText('Stopped');
  }, [examId]);

  // ─── Start everything ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (active === false) return;

    // Reset shutdown flag so Strict Mode double-mount doesn't break us
    activeRef.current  = true;
    violationLockRef.current = false;
    violationCountRef.current = 0;
    faceGraceRef.current = 0;
    sessionStarted.current = false;

    let unmounted = false;

    const init = async () => {
      // 1. Start backend session
      try {
        const locPos = await new Promise((res, rej) => {
          if (!navigator.geolocation) { res(null); return; }
          navigator.geolocation.getCurrentPosition(res, () => res(null), { timeout: 6000 });
        });
        if (unmounted) return;

        const location = locPos ? {
          latitude:  locPos.coords.latitude,
          longitude: locPos.coords.longitude,
          accuracy:  locPos.coords.accuracy,
        } : null;

        if (location) {
          initialLocationRef.current = location;
          setLocationStatus('ok');
        } else {
          setLocationStatus('denied');
        }

        if (!sessionStarted.current) {
          await api.post('/monitoring/start', { examId, location });
          sessionStarted.current = true;
        }
      } catch (e) {
        console.warn('[ExamMonitor] session start error:', e.message);
      }

      if (!activeRef.current || unmounted) return;
      setStatusText('Active');

      // 2. Start geolocation watch (threshold 50m to avoid GPS jitter)
      if (navigator.geolocation && initialLocationRef.current) {
        watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            if (!activeRef.current) return;
            const init = initialLocationRef.current;
            if (!init) return;
            const dist = haversine(init.latitude, init.longitude, pos.coords.latitude, pos.coords.longitude);
            if (dist > 50) {
              showWarning(`⚠️ Location change detected — moved ${Math.round(dist)}m`);
              logViolation('/monitoring/location-change', {
                currentLocation: { latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy },
                distance: dist,
              }, 'location_change');
            }
          },
          (err) => console.warn('[ExamMonitor] geolocation watch error:', err.message),
          { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
        );
      }

      // 3. Load face model + start camera
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
        if (!activeRef.current || unmounted) return;
        setFaceModelsLoaded(true);

        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (!activeRef.current || unmounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;
        setCameraStatus('ok');

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }

        // 4. Start face detection loop (every 2 s)
        faceIntervalRef.current = setInterval(async () => {
          if (!activeRef.current || !videoRef.current) return;
          const vid = videoRef.current;
          if (vid.readyState < 2 || vid.paused || vid.videoWidth === 0) return;

          const dets = await faceapi.detectAllFaces(vid, new faceapi.TinyFaceDetectorOptions({ inputSize: 128, scoreThreshold: 0.4 }));
          if (!activeRef.current) return;

          if (dets.length === 0) {
            faceGraceRef.current += 1;
            setFaceDetected(false);
            // Log only after 2 consecutive missed frames (4s) to avoid false positives
            if (faceGraceRef.current === 2) {
              showWarning('🚨 Face not detected — keep your face visible!');
              logViolation('/monitoring/face-absence', {}, 'face_absence');
            }
          } else {
            faceGraceRef.current = 0;
            setFaceDetected(true);
          }
        }, 2000);

      } catch (err) {
        console.error('[ExamMonitor] Camera/FaceAPI error:', err);
        setCameraStatus('blocked');
        showWarning('⚠️ Camera blocked — face detection disabled');
      }
    };

    init();

    return () => {
      unmounted = true;
      // Don't call full doShutdown here (would notify backend prematurely in Strict Mode)
      // Just clean up streams — backend session ends only when active=false prop arrives
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      if (faceIntervalRef.current) {
        clearInterval(faceIntervalRef.current);
        faceIntervalRef.current = null;
      }
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId]);

  // ─── Tab switch detection (always on, ref-gated, no state dependency) ─────────
  useEffect(() => {
    const handle = () => {
      if (!activeRef.current) return;
      if (document.hidden) {
        showWarning('🚫 Tab switch detected — stay on the exam!');
        logViolation('/monitoring/tab-switch', {}, 'tab_switch');
      }
    };
    document.addEventListener('visibilitychange', handle);
    return () => document.removeEventListener('visibilitychange', handle);
  }, [logViolation, showWarning]);

  // ─── Window blur detection ────────────────────────────────────────────────────
  useEffect(() => {
    const handle = () => {
      if (!activeRef.current) return;
      showWarning('⚠️ Window focus lost — keep exam window active!');
      logViolation('/monitoring/screen-blur', {}, 'screen_blur');
    };
    window.addEventListener('blur', handle);
    return () => window.removeEventListener('blur', handle);
  }, [logViolation, showWarning]);

  // ─── Prevent right-click and copy-paste ──────────────────────────────────────
  useEffect(() => {
    const noContext = (e) => { if (activeRef.current) e.preventDefault(); };
    const noKeys    = (e) => {
      if (!activeRef.current) return;
      if ((e.ctrlKey || e.metaKey) && ['c','v','x','a'].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    };
    document.addEventListener('contextmenu', noContext);
    document.addEventListener('keydown', noKeys);
    return () => {
      document.removeEventListener('contextmenu', noContext);
      document.removeEventListener('keydown', noKeys);
    };
  }, []);

  // ─── Haversine distance (meters) ─────────────────────────────────────────────
  function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // ─── Render: hide completely after shutdown ───────────────────────────────────
  if (shutDown) return null;

  const totalViolations = violations.length;

  return (
    <div style={{
      position: 'fixed',
      top: 12,
      right: 12,
      width: 220,
      background: 'rgba(15,23,42,0.92)',
      backdropFilter: 'blur(12px)',
      border: `1.5px solid ${totalViolations > 3 ? '#ef4444' : '#334155'}`,
      borderRadius: 14,
      padding: '12px 14px',
      zIndex: 9999,
      color: '#f1f5f9',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: 12,
      boxShadow: totalViolations > 3
        ? '0 0 0 3px rgba(239,68,68,0.25), 0 8px 32px rgba(0,0,0,0.4)'
        : '0 8px 32px rgba(0,0,0,0.4)',
      transition: 'border-color 0.3s, box-shadow 0.3s',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, borderBottom: '1px solid #334155', paddingBottom: 8 }}>
        <span style={{ fontSize: 14 }}>🛡️</span>
        <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: '-0.2px' }}>Proctoring Active</span>
        <span style={{
          marginLeft: 'auto',
          fontSize: 10,
          fontWeight: 600,
          padding: '2px 7px',
          borderRadius: 99,
          background: statusText === 'Active' ? 'rgba(16,185,129,0.2)' : 'rgba(251,191,36,0.2)',
          color:      statusText === 'Active' ? '#10b981' : '#fbbf24',
          border:     `1px solid ${statusText === 'Active' ? '#10b981' : '#fbbf24'}`,
        }}>
          {statusText === 'Active' ? '● LIVE' : '◌ ' + statusText}
        </span>
      </div>

      {/* Camera feed */}
      <div style={{ position: 'relative', marginBottom: 10, borderRadius: 8, overflow: 'hidden',
        border: `2px solid ${cameraStatus === 'ok' ? (faceDetected ? '#10b981' : '#ef4444') : '#64748b'}` }}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{ width: '100%', display: 'block', borderRadius: 6, background: '#0f172a' }}
        />
        {cameraStatus === 'loading' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(15,23,42,0.8)', fontSize: 10, color: '#94a3b8' }}>
            Starting camera…
          </div>
        )}
        {cameraStatus === 'blocked' && (
          <div style={{ padding: '8px', fontSize: 10, color: '#f87171', textAlign: 'center' }}>
            📷 Camera blocked
          </div>
        )}
        {cameraStatus === 'ok' && !faceDetected && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(239,68,68,0.85)',
            fontSize: 10, fontWeight: 700, textAlign: 'center', padding: '3px', color: 'white' }}>
            🚨 No face detected
          </div>
        )}
      </div>

      {/* Status rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 10 }}>
        <StatusRow icon="📷" label="Camera" status={cameraStatus === 'ok' ? 'ok' : cameraStatus === 'blocked' ? 'err' : 'loading'} text={cameraStatus === 'ok' ? 'Active' : cameraStatus === 'blocked' ? 'Blocked' : 'Loading'} />
        <StatusRow icon="📍" label="Location" status={locationStatus === 'ok' ? 'ok' : locationStatus === 'denied' ? 'warn' : 'loading'} text={locationStatus === 'ok' ? 'Verified' : locationStatus === 'denied' ? 'Unavailable' : 'Detecting'} />
        <StatusRow icon="👤" label="Face" status={faceDetected ? 'ok' : 'err'} text={faceDetected ? 'Detected' : 'Missing'} />
        <StatusRow icon="🚫" label="Violations" status={totalViolations === 0 ? 'ok' : totalViolations < 3 ? 'warn' : 'err'} text={`${totalViolations}`} />
      </div>

      {/* Warning banner */}
      {warningVisible && lastWarning && (
        <div style={{
          background: 'rgba(239,68,68,0.15)',
          border: '1px solid rgba(239,68,68,0.5)',
          borderRadius: 8,
          padding: '7px 9px',
          fontSize: 11,
          color: '#fca5a5',
          fontWeight: 600,
          animation: 'fadeIn 0.2s ease',
          wordBreak: 'break-word',
          marginTop: 2,
        }}>
          {lastWarning}
        </div>
      )}

      {totalViolations > 3 && (
        <div style={{ marginTop: 8, padding: '6px 8px', background: 'rgba(239,68,68,0.2)', border: '1px solid #ef4444',
          borderRadius: 8, fontSize: 10, fontWeight: 700, color: '#f87171', textAlign: 'center' }}>
          ⚠️ HIGH VIOLATION COUNT — Exam may be cancelled!
        </div>
      )}
    </div>
  );
};

const StatusRow = ({ icon, label, status, text }) => {
  const colors = {
    ok:      { bg: 'rgba(16,185,129,0.1)',  text: '#34d399', dot: '#10b981' },
    warn:    { bg: 'rgba(251,191,36,0.1)',  text: '#fbbf24', dot: '#f59e0b' },
    err:     { bg: 'rgba(239,68,68,0.1)',   text: '#f87171', dot: '#ef4444' },
    loading: { bg: 'rgba(148,163,184,0.1)', text: '#94a3b8', dot: '#64748b' },
  };
  const c = colors[status] || colors.loading;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px',
      background: c.bg, borderRadius: 6 }}>
      <span style={{ fontSize: 11 }}>{icon}</span>
      <span style={{ flex: 1, color: '#cbd5e1', fontSize: 11 }}>{label}</span>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
      <span style={{ color: c.text, fontWeight: 600, fontSize: 11 }}>{text}</span>
    </div>
  );
};

export default ExamMonitor;
