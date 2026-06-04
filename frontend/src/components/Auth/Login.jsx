import { useState } from 'react';
import { useAuth } from '../../AuthContext.jsx';
import { useNavigate, Link } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      // login function might not need role, but let's pass it anyway or just keep it as is
      const loggedUser = await login(email, password);
      
      // Basic check if the role they selected matches their actual role
      if (loggedUser.role !== role) {
        setError(`You are not registered as a ${role}.`);
        setLoading(false);
        return;
      }

      navigate(`/${loggedUser.role}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f0f2f8 0%, #eef2ff 100%)', padding: '20px' }}>
      <div className="auth-container">
        <div className="auth-logo">
          <span className="auth-logo-icon">🎓</span>
        </div>
        <h2>Welcome Back</h2>
        <p className="auth-subtitle">Sign in to your Examsphere account</p>

        {error && (
          <div className="alert-error" style={{ marginBottom: '16px' }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input
            id="login-email"
            type="email"
            placeholder="Email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <input
            id="login-password"
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          <select 
            id="login-role"
            value={role}
            onChange={e => setRole(e.target.value)}
            style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '2px solid #e1e4f0', marginBottom: '16px', fontSize: '15px' }}
          >
            <option value="student">👨‍🎓 Student</option>
            <option value="educator">👨‍🏫 Educator</option>
          </select>

          <button type="submit" className="btn-auth" disabled={loading}>
            {loading ? '⏳ Signing in…' : '🚀 Sign In'}
          </button>
        </form>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', fontSize: '14px' }}>
          <p style={{ margin: 0 }}>Don't have an account? <Link to="/register">Create one →</Link></p>
          {role === 'student' && (
            <Link to="/forgot-password" style={{ color: 'var(--primary)', fontWeight: '600' }}>Forgot Password?</Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;