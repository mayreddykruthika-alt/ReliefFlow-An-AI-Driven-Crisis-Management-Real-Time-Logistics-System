import React, { useState } from 'react';
import axios from 'axios';

export default function Register({ API_URL, setActiveTab }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("DISPATCHER");
  const [statusMsg, setStatusMsg] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!username || !password) {
      setStatusMsg("Please provide both username and password.");
      setIsSuccess(false);
      return;
    }

    setLoading(true);
    setStatusMsg("");
    try {
      const res = await axios.post(`${API_URL}/api/v1/auth/register`, { username, password, role });
      const msg = res.data?.message || `User '${username}' registered!`;
      setStatusMsg(msg);
      setIsSuccess(true);
      // Fallback alert preserved for system consistency
      // alert(msg);
    } catch (err) {
      const errorText = err.response?.data?.detail || "Registration failed. Try another username.";
      setStatusMsg(errorText);
      setIsSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📋</div>
          <h2>Create Operator Account</h2>
          <p>Register as a certified emergency dispatcher, administrator, or victim reporter</p>
        </div>

        {statusMsg && (
          <div className={isSuccess ? "feedback-card feedback-success" : "error-banner"} style={{ marginBottom: '1.25rem' }}>
            <span>{isSuccess ? "✅" : "⚠️"}</span>
            <span>{statusMsg}</span>
          </div>
        )}

        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label htmlFor="reg-username">Username</label>
            <input 
              id="reg-username"
              type="text" 
              placeholder="Enter unique username" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="reg-password">Password</label>
            <input 
              id="reg-password"
              type="password" 
              placeholder="Create secure password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="reg-role">System Role & Permissions</label>
            <select 
              id="reg-role"
              value={role} 
              onChange={e => setRole(e.target.value)}
            >
              <option value="DISPATCHER">DISPATCHER — Resource Locking & Fleet Operations</option>
              <option value="ADMIN">ADMIN — Full System Governance & Audit Inspection</option>
              <option value="VICTIM">VICTIM — Public Incident Triage & First-Aid Access</option>
            </select>
          </div>

          <button 
            type="submit" 
            className="btn-success" 
            style={{ width: '100%', marginTop: '0.75rem' }} 
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                <span>Registering Account...</span>
              </>
            ) : (
              <span>Register Account</span>
            )}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account?{' '}
          <button type="button" onClick={() => setActiveTab && setActiveTab('login')}>
            Sign In here
          </button>
        </div>
      </div>
    </div>
  );
}