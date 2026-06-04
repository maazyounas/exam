import { Routes, Route, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../AuthContext.jsx";

import Profile from "./Profile.jsx";
import SettingsPage from "./Settings.jsx";
import Questions from "./Questions.jsx";
import Exams from "./Exams.jsx";
import Reports from "./Reports.jsx";
import Monitoring from "./Monitoring.jsx";
import Notifications from "./Notifications.jsx";
import FeedbackIssues from "./FeedbackIssues.jsx";
import PasswordResets from "./PasswordResets.jsx";

const NAV = [
  { to: "/educator", icon: "🏠", label: "Dashboard" },
  { to: "/educator/exams", icon: "📝", label: "Exams" },
  { to: "/educator/questions", icon: "🗂️", label: "Question Bank" },
  { to: "/educator/monitoring", icon: "📡", label: "Monitoring" },
  { to: "/educator/reports", icon: "📊", label: "Reports" },
  { to: "/educator/feedback-issues", icon: "💬", label: "Feedback & Issues" },
  { to: "/educator/notifications", icon: "🔔", label: "Notifications" },
  { to: "/educator/password-resets", icon: "🔐", label: "Password Resets" },
  { to: "/educator/profile", icon: "👤", label: "Profile" },
  { to: "/educator/settings", icon: "⚙️", label: "Settings" },
];

const cards = [
  { icon: "📝", label: "Quick Start", sub: "Create an exam" },

  { icon: "📚", label: "Question Bank", sub: "Add questions" },

  { icon: "📡", label: "Monitoring", sub: "Live proctoring" },

  { icon: "📊", label: "Reports", sub: "View results" },

  { icon: "⚙️", label: "Settings", sub: "Change password" },
];

const getInitials = (name = "") =>
  name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const EducatorDashboard = () => {
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
              <div className="sidebar-user-name">
                {user?.name || "Educator"}
              </div>
              <div className="sidebar-user-role">Educator</div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-nav-label">Navigation</div>

          {NAV.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/educator"}
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
        <Routes>
          <Route index element={<EducatorHome user={user} />} />
          <Route path="profile" element={<Profile />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="questions" element={<Questions />} />
          <Route path="exams" element={<Exams />} />
          <Route path="monitoring" element={<Monitoring />} />
          <Route path="reports" element={<Reports />} />
          <Route path="feedback-issues" element={<FeedbackIssues />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="password-resets" element={<PasswordResets />} />
        </Routes>
      </main>
    </div>
  );
};

const EducatorHome = ({ user }) => (
  <div className="panel" style={{ animation: "slideUp 0.4s ease" }}>
    <div className="welcome-banner">
      <h2>Welcome back, {user?.name?.split(" ")[0] || "Educator"}!</h2>

      <p>
        Manage your exams, monitor students, and review performance reports.
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

    {/* NEW EDUCATOR CONTENT */}

    <div className="educator-home-grid">
      {/* Guidelines */}
      <div className="extra-card">
        <h3>📘 Educator Guidelines</h3>

        <ul>
          <li>Create exams with clear instructions.</li>
          <li>Verify all questions before publishing.</li>
          <li>Monitor suspicious student activity.</li>
          <li>Review reports after each examination.</li>
        </ul>
      </div>

      {/* Tips */}
      <div className="extra-card">
        <h3>💡 Teaching Tips</h3>

        <ul>
          <li>Keep exam difficulty balanced.</li>
          <li>Use randomized questions for fairness.</li>
          <li>Set appropriate exam durations.</li>
          <li>Provide feedback after evaluation.</li>
        </ul>
      </div>
    </div>

    {/* Getting Started */}

    <div className="panel-form educator-guide">
      <h4>🚀 Getting Started</h4>

      <ol>
        <li>
          Go to <strong>Question Bank</strong> to add MCQ questions.
        </li>

        <li>
          Go to <strong>Exams</strong> to create exams and assign questions.
        </li>

        <li>Share the Exam Code with students to join the exam.</li>

        <li>
          Use <strong>Monitoring</strong> for live student tracking.
        </li>

        <li>
          Review detailed analytics in <strong>Reports</strong>.
        </li>
      </ol>
    </div>
  </div>
);

export default EducatorDashboard;
