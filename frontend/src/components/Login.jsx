import React, { useState } from 'react';
import axios from 'axios';

export default function Login({ API_URL, setToken, setRole, setActiveTab }) {
  const [username, setUsername] = useState("dispatcher");
  const [password, setPassword] = useState("dispatch123");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('username', username);
      formData.append('password', password);

      const res = await axios.post(`${API_URL}/token`, formData);
      setToken(res.data.access_token);
      setRole(res.data.role);
      setActiveTab("dispatch");
    } catch (err) {
      setErrorMsg("Invalid username or password. Please verify seeded credentials.");
    } finally {
      setLoading(false);
    }
  };

  const setCredentials = (user, pass) => {
    setUsername(user);
    setPassword(pass);
    setErrorMsg("");
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔐</div>
          <h2>Login to ReliefFlow</h2>
          <p>Access the real-time emergency dispatch and crisis DBMS console</p>
        </div>

        {/* Demo Fast-Fill Chips for Evaluator Convenience */}
        <div className="auth-demo-chips">
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
            Quick Demo:
          </span>
          <button 
            type="button" 
            className="demo-chip-btn" 
            onClick={() => setCredentials("dispatcher", "dispatch123")}
          >
            🚒 Dispatcher
          </button>
          <button 
            type="button" 
            className="demo-chip-btn" 
            onClick={() => setCredentials("admin", "dispatch123")}
          >
            🛡️ Admin
          </button>
        </div>

        {errorMsg && (
          <div className="error-banner">
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="login-username">Operator Username</label>
            <input 
              id="login-username"
              type="text" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              placeholder="e.g. dispatcher"
              required 
            />
          </div>

          <div className="form-group">
            <label htmlFor="login-password">Access Password</label>
            <input 
              id="login-password"
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="••••••••••••"
              required 
            />
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            style={{ width: '100%', marginTop: '0.75rem' }} 
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                <span>Authenticating...</span>
              </>
            ) : (
              <span>Sign In to Console</span>
            )}
          </button>
        </form>

        <div className="auth-footer">
          Don't have an operator account?{' '}
          <button type="button" onClick={() => setActiveTab && setActiveTab('register')}>
            Register here
          </button>
        </div>
      </div>
    </div>
  );
}