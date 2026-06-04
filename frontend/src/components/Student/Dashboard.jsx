import { Routes, Route, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../AuthContext.jsx";

import Profile from "./Profile.jsx";
import Settings from "./Settings.jsx";
import Exams from "./Exams.jsx";
import Results from "./Results.jsx";
import TakeExam from "./TakeExam.jsx";
import NotificationBell from "./NotificationBell.jsx";

const NAV = [
  { to: "/student", icon: "🏠", label: "Dashboard" },
  { to: "/student/exams", icon: "📝", label: "My Exams" },
  { to: "/student/results", icon: "🏆", label: "Results" },
  { to: "/student/profile", icon: "👤", label: "Profile" },
  { to: "/student/settings", icon: "⚙️", label: "Settings" },
];

const cards = [
  { icon: "📚", label: "My Exams", sub: "View enrolled exams" },
  { icon: "📊", label: "Results", sub: "See your scores" },
  { icon: "👤", label: "Profile", sub: "Manage your info" },
  { icon: "🔐", label: "Settings", sub: "Change password" },
  { icon: "🛡️", label: "Secure", sub: "Proctored environment" },
];

const getInitials = (name = "") =>
  name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const StudentDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="sidebar-brand-icon">🎓</div>
            <span className="sidebar-brand-name">Examsphere</span>
          </div>

          <div className="sidebar-user">
            <div className="sidebar-avatar">{getInitials(user?.name)}</div>

            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.name || "Student"}</div>
              <div className="sidebar-user-role">Student</div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-nav-label">Navigation</div>

          {NAV.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/student"}
              className={({ isActive }) =>
                `sidebar-link${isActive ? " active" : ""}`
              }
            >
              <span className="sidebar-link-icon">{icon}</span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="btn-logout" onClick={handleLogout}>
            <span>🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <div className="dashboard-topbar">
          <NotificationBell />
        </div>

        <Routes>
          <Route index element={<StudentHome user={user} />} />
          <Route path="profile" element={<Profile />} />
          <Route path="settings" element={<Settings />} />
          <Route path="exams" element={<Exams />} />
          <Route path="results" element={<Results />} />
          <Route path="take-exam/:id" element={<TakeExam />} />
        </Routes>
      </main>
    </div>
  );
};

const StudentHome = ({ user }) => (
  <div className="panel" style={{ animation: "slideUp 0.4s ease" }}>
    <div className="welcome-banner">
      <h2>Hello, {user?.name?.split(" ")[0] || "Student"}!</h2>
      <p>
        Check your enrolled exams, view past results, and manage your account.
      </p>
    </div>

    <div className="stat-cards">
      {cards.map(({ icon, label, sub }) => (
        <div className="stat-card" key={label}>
          <span className="stat-card-icon">{icon}</span>
          <div className="stat-card-value" style={{ fontSize: "18px" }}>
            {label}
          </div>
          <div className="stat-card-label">{sub}</div>
        </div>
      ))}
    </div>
    {/* Static Information Section */}

    <div className="student-home-extra">
      <div className="extra-card">
        <h3>🎓 Student Guidelines</h3>

        <ul>
          <li>Arrive 15 minutes before exam time.</li>
          <li>Keep your webcam enabled during exams.</li>
          <li>Do not refresh the browser during a test.</li>
          <li>Any suspicious activity may terminate the exam.</li>
        </ul>
      </div>

      <div className="extra-card">
        <h3>💡 Quick Tips</h3>

        <ul>
          <li>Read every question carefully.</li>
          <li>Manage your time efficiently.</li>
          <li>Review answers before submission.</li>
        </ul>
      </div>
    </div>
  </div>
);

export default StudentDashboard;
