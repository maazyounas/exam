import { useState } from 'react';
import { useAuth } from '../../AuthContext.jsx';
import { useNavigate, Link } from 'react-router-dom';

const Register = () => {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student', studentId: '', course: '', department: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => {
      if (name === 'role') {
        return value === 'student'
          ? { ...prev, role: value, department: '' }
          : { ...prev, role: value, studentId: '', course: '' };
      }

      return { ...prev, [name]: value };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      };

      if (form.role === 'student') {
        payload.studentId = form.studentId.trim();
        if (form.course.trim()) payload.course = form.course.trim();
      }

      if (form.role === 'educator' && form.department.trim()) {
        payload.department = form.department.trim();
      }

      await register(payload);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f0f2f8 0%, #eef2ff 100%)', padding: '20px' }}>
      <div className="auth-container" style={{ maxWidth: '460px' }}>
        <div className="auth-logo">
          <span className="auth-logo-icon">🎓</span>
        </div>
        <h2>Create Account</h2>
        <p className="auth-subtitle">Join Examsphere — it only takes a minute</p>

        {error && (
          <div className="alert-error" style={{ marginBottom: '16px' }}>⚠️ {error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <input id="reg-name" name="name" placeholder="Full name" value={form.name} onChange={handleChange} required autoComplete="name" />
          <input id="reg-email" name="email" type="email" placeholder="Email address" value={form.email} onChange={handleChange} required autoComplete="email" />
          <input id="reg-password" name="password" type="password" placeholder="Password" value={form.password} onChange={handleChange} required autoComplete="new-password" />

          <select id="reg-role" name="role" value={form.role} onChange={handleChange}>
            <option value="student">👨‍🎓 Student</option>
            <option value="educator">👨‍🏫 Educator</option>
          </select>

          {form.role === 'student' && (
            <>
              <input id="reg-studentid" name="studentId" placeholder="5-digit Student ID" value={form.studentId} onChange={handleChange} required pattern="\d{5}" title="Student ID must be exactly 5 digits" />
              <input id="reg-course" name="course" placeholder="Course (optional)" value={form.course} onChange={handleChange} />
            </>
          )}

          {form.role === 'educator' && (
            <input id="reg-dept" name="department" placeholder="Department (optional)" value={form.department} onChange={handleChange} />
          )}

          <button type="submit" className="btn-auth" disabled={loading}>
            {loading ? '⏳ Creating account…' : '✅ Create Account'}
          </button>
        </form>

        <p>Already have an account? <Link to="/login">Sign in →</Link></p>
      </div>
    </div>
  );
};

export default Register;
