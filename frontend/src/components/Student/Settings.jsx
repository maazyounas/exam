import ChangePasswordForm from '../shared/ChangePasswordForm.jsx';

const Settings = () => (
  <div className="panel">
    <div className="page-header">
      <h2>Settings</h2>
      <p>Manage your student account security.</p>
    </div>

    <ChangePasswordForm roleLabel="Student" />
  </div>
);

export default Settings;
