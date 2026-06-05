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
    setError('');
    setLoading(true);

    try {
      const loggedUser = await login(email, password);

      if (loggedUser.role !== role) {
        setError(`You are not registered as a ${role}.`);
        setLoading(false);
        return;
      }

      navigate(`/${loggedUser.role}`);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Invalid email or password. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">

        {/* HEADER */}
        <div className="login-header">
          <div className="login-logo">🎓</div>
          <h2>Welcome Back</h2>
          <p>Sign in to continue your learning journey</p>
        </div>

        {/* ERROR */}
        {error && (
          <div className="login-error">
            ⚠ {error}
          </div>
        )}

        {/* FORM */}
        <form onSubmit={handleSubmit} className="login-form">

          <label>Email</label>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />

          <label>Password</label>
          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />

          <label>Login as</label>
          <select
            value={role}
            onChange={e => setRole(e.target.value)}
          >
            <option value="student">🎓 Student</option>
            <option value="educator">👨‍🏫 Educator</option>
          </select>

          <button type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* ACTIONS */}
        <div className="auth-actions">
          <div className="auth-actions-row">
            <span>Don’t have an account?</span>
            <Link to="/register">Create one</Link>
          </div>

          <div className="auth-actions-row">
            <span>Forgot your password?</span>
            <Link to="/forgot-password">Reset</Link>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;