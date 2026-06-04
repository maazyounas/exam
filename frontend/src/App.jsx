import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import Login from './components/Auth/Login.jsx';
import Register from './components/Auth/Register.jsx';
import ForgotPassword from './components/Auth/ForgotPassword.jsx';
import StudentDashboard from './components/Student/Dashboard.jsx';
import EducatorDashboard from './components/Educator/Dashboard.jsx';
import './App.css';

function App() {
  const { user } = useAuth();

  return (
    <div className="App">
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to={`/${user.role}`} />} />
        <Route path="/register" element={!user ? <Register /> : <Navigate to={`/${user.role}`} />} />
        <Route path="/forgot-password" element={!user ? <ForgotPassword /> : <Navigate to={`/${user.role}`} />} />
        <Route path="/student/*" element={user?.role === 'student' ? <StudentDashboard /> : <Navigate to="/login" />} />
        <Route path="/educator/*" element={user?.role === 'educator' ? <EducatorDashboard /> : <Navigate to="/login" />} />
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </div>
  );
}

export default App;

