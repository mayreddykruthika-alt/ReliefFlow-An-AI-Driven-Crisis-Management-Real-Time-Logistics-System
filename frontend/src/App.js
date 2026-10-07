import React, { useState, useEffect } from 'react';
import Register from './components/Register';
import Login from './components/Login';
import Chatbot from './components/Chatbot';
import Search from './components/Search';
import Dispatch from './components/Dispatch';
import Audit from './components/Audit';
import './App.css';

const API_URL = "http://127.0.0.1:8000";

function App() {
  const [token, setToken] = useState("");
  const [role, setRole] = useState("");
  const [activeTab, setActiveTab] = useState("home");
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('reliefflow_theme') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('reliefflow_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const getRoleClass = () => {
    if (!role) return 'role-guest';
    const r = role.toLowerCase();
    if (r === 'dispatcher') return 'role-dispatcher';
    if (r === 'admin') return 'role-admin';
    if (r === 'victim') return 'role-victim';
    return 'role-dispatcher';
  };

  return (
    <div className="app-wrapper">
      {/* Top Header Bar */}
      <nav className="navbar">
        <div className="nav-brand" onClick={() => setActiveTab('home')}>
          <div className="nav-brand-beacon">
            <span>🚨</span>
          </div>
          <div className="nav-brand-text">
            <div className="nav-brand-title">
              RELIEF <span>FLOW</span>
            </div>
            <div className="nav-brand-tag">High-Concurrency Crisis DBMS</div>
          </div>
        </div>

        {/* Active Navigation Tabs Corresponding to All 5 Application Views */}
        <div className="nav-links">
          <button 
            className={`nav-tab-btn ${activeTab === 'home' ? 'active' : ''}`} 
            onClick={() => setActiveTab('home')}
          >
            Home
          </button>
          <button 
            className={`nav-tab-btn ${activeTab === 'chatbot' ? 'active' : ''}`} 
            onClick={() => setActiveTab('chatbot')}
          >
            1. First-Aid Bot
          </button>
          <button 
            className={`nav-tab-btn ${activeTab === 'search' ? 'active' : ''}`} 
            onClick={() => setActiveTab('search')}
          >
            2. Vector Search
          </button>
          <button 
            className={`nav-tab-btn ${activeTab === 'dispatch' ? 'active' : ''}`} 
            onClick={() => setActiveTab('dispatch')}
          >
            3. Dispatcher
          </button>
          <button 
            className={`nav-tab-btn ${activeTab === 'audit' ? 'active' : ''}`} 
            onClick={() => setActiveTab('audit')}
          >
            4. Audit Trail
          </button>
        </div>

        {/* Right Nav Actions: Role Badge, Auth Links, Theme Switch, Logout */}
        <div className="nav-right-actions">
          {token ? (
            <>
              {/* Styled Role Badge Indicator */}
              <span className={`role-badge ${getRoleClass()}`}>
                <span style={{ fontSize: '0.65rem' }}>●</span> {role || 'USER'}
              </span>

              {/* Logout Button (Retaining exact functional logout handler) */}
              <button 
                className="btn-logout" 
                onClick={() => { setToken(""); setRole(""); setActiveTab("home"); }}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <button 
                className={`nav-tab-btn ${activeTab === 'login' ? 'active' : ''}`} 
                onClick={() => setActiveTab('login')}
              >
                Login
              </button>
              <button 
                className={`nav-tab-btn ${activeTab === 'register' ? 'active' : ''}`} 
                onClick={() => setActiveTab('register')}
              >
                Register
              </button>
            </>
          )}

          {/* Dark / Light Theme Toggle Button */}
          <button 
            className="theme-toggle-btn" 
            onClick={toggleTheme} 
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            aria-label="Toggle Dark/Light Mode"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </nav>

      {/* Main Container */}
      <div className="container">
        {/* Page 1: Hero / Homepage */}
        {activeTab === 'home' && (
          <div className="card hero-section">
            <div className="hero-pill-badge">
              <span className="hero-pulse-dot"></span>
              High-Availability Crisis DBMS Engine
            </div>

            <h1 className="hero-title">
              RELIEF <span>FLOW</span>
            </h1>

            <h2 className="hero-subtitle">
              Real-Time Emergency Dispatch & Disaster Management Platform
            </h2>

            <p className="hero-description">
              Full-stack hybrid microservices platform integrating PostgreSQL vector embeddings,
              concurrency control via pessimistic row-level locking, automated PL/pgSQL compliance triggers,
              and instant RAG-driven emergency first-aid triage.
            </p>

            {/* Action CTAs */}
            {!token ? (
              <div className="hero-cta-group">
                <button className="btn-primary" onClick={() => setActiveTab('login')}>
                  <span>⚡</span> Login to Dispatcher Portal
                </button>
                <button className="btn-secondary" onClick={() => setActiveTab('register')}>
                  <span>✍️</span> Register Account
                </button>
              </div>
            ) : (
              <div className="active-session-banner">
                <div className="active-session-info">
                  <div className="active-session-dot"></div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                      Authenticated Session Active: <span style={{ color: 'var(--crimson)' }}>{role}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Select a core service module below to begin operations
                    </div>
                  </div>
                </div>

                <div className="active-session-shortcuts">
                  <button className="btn-secondary btn-sm" onClick={() => setActiveTab('chatbot')}>
                    First-Aid Bot
                  </button>
                  <button className="btn-secondary btn-sm" onClick={() => setActiveTab('search')}>
                    Vector Search
                  </button>
                  <button className="btn-primary btn-sm" onClick={() => setActiveTab('dispatch')}>
                    Dispatcher
                  </button>
                  <button className="btn-secondary btn-sm" onClick={() => setActiveTab('audit')}>
                    Audit Trail
                  </button>
                </div>
              </div>
            )}

            {/* Real-time Technical Metrics Ticker */}
            <div className="stats-ticker-bar">
              <div className="stat-item">
                <span className="stat-value" style={{ color: 'var(--crimson)' }}>FOR UPDATE</span>
                <span className="stat-label">Pessimistic Row Lock</span>
              </div>
              <div className="stat-item">
                <span className="stat-value" style={{ color: 'var(--blue)' }}>TF-IDF + Cosine</span>
                <span className="stat-label">Vector Semantic Search</span>
              </div>
              <div className="stat-item">
                <span className="stat-value" style={{ color: 'var(--emerald)' }}>PL/pgSQL</span>
                <span className="stat-label">Audit Trigger Logs</span>
              </div>
              <div className="stat-item">
                <span className="stat-value" style={{ color: 'var(--amber)' }}>10 Active</span>
                <span className="stat-label">Emergency Fleet Units</span>
              </div>
            </div>

            {/* Architecture Summary Cards Grid: 4 Core Technical Pillars */}
            <div className="architecture-grid">
              {/* Pillar 1 */}
              <div className="arch-card" onClick={() => setActiveTab('dispatch')}>
                <div className="arch-card-icon" style={{ color: 'var(--crimson)' }}>
                  🔒
                </div>
                <div className="arch-card-tag">Pillar 1: ACID Concurrency</div>
                <h3 className="arch-card-title">Pessimistic Row-Level Locking</h3>
                <p className="arch-card-desc">
                  Utilizes <code>SELECT ... FOR UPDATE</code> to ensure race-condition-free resource
                  dispatch under heavy concurrent dispatcher loads, completely eliminating double-allocations.
                </p>
                <div className="arch-card-action">
                  <span>Open Dispatcher Engine</span> ➔
                </div>
              </div>

              {/* Pillar 2 */}
              <div className="arch-card" onClick={() => setActiveTab('search')}>
                <div className="arch-card-icon" style={{ color: 'var(--blue)' }}>
                  🔍
                </div>
                <div className="arch-card-tag">Pillar 2: Vector Database</div>
                <h3 className="arch-card-title">Full-Corpus Vector Semantic Search</h3>
                <p className="arch-card-desc">
                  Full-corpus vector semantic incident ranking powered by TF-IDF and Cosine Similarity,
                  transforming unstructured victim SOS dispatches into ranked priority coordinates.
                </p>
                <div className="arch-card-action">
                  <span>Search Incidents</span> ➔
                </div>
              </div>

              {/* Pillar 3 */}
              <div className="arch-card" onClick={() => setActiveTab('audit')}>
                <div className="arch-card-icon" style={{ color: 'var(--emerald)' }}>
                  📜
                </div>
                <div className="arch-card-tag">Pillar 3: Immutable Governance</div>
                <h3 className="arch-card-title">Automated PL/pgSQL Audit Triggers</h3>
                <p className="arch-card-desc">
                  Native PostgreSQL triggers capture all state transitions (<code>old_state ➔ new_state</code>)
                  directly at the database level for transparent and unforgeable compliance logging.
                </p>
                <div className="arch-card-action">
                  <span>View Live Audit Trail</span> ➔
                </div>
              </div>

              {/* Pillar 4 */}
              <div className="arch-card" onClick={() => setActiveTab('chatbot')}>
                <div className="arch-card-icon" style={{ color: 'var(--amber)' }}>
                  🩺
                </div>
                <div className="arch-card-tag">Pillar 4: Retrieval-Augmented Generation</div>
                <h3 className="arch-card-title">First-Aid Emergency RAG Chatbot</h3>
                <p className="arch-card-desc">
                  Domain-specific medical knowledge retriever providing instant life-saving triage
                  steps and critical DO-NOT warnings during disaster situations.
                </p>
                <div className="arch-card-action">
                  <span>Launch First-Aid Bot</span> ➔
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View Routing with Preserved Component Props */}
        {activeTab === 'register' && <Register API_URL={API_URL} setActiveTab={setActiveTab} />}
        {activeTab === 'login' && <Login API_URL={API_URL} setToken={setToken} setRole={setRole} setActiveTab={setActiveTab} />}
        {activeTab === 'chatbot' && <Chatbot API_URL={API_URL} token={token} />}
        {activeTab === 'search' && <Search API_URL={API_URL} token={token} />}
        {activeTab === 'dispatch' && <Dispatch API_URL={API_URL} token={token} />}
        {activeTab === 'audit' && <Audit API_URL={API_URL} token={token} />}
      </div>
    </div>
  );
}

export default App;