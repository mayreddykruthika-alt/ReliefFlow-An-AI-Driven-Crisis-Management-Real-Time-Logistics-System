import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

export default function Audit({ API_URL, token }) {
  const [logs, setLogs] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchAuditLogs = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await axios.get(`${API_URL}/api/v1/audit-logs`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      if (res.data && Array.isArray(res.data.audit_trail)) {
        setLogs(res.data.audit_trail);
      } else {
        setLogs([]);
      }
    } catch (err) { 
      const detail = err.response?.data?.detail;
      setErrorMsg(typeof detail === 'string' ? detail : "Error fetching audit logs from PostgreSQL."); 
    } finally {
      setLoading(false);
    }
  }, [API_URL, token]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  const renderStateJson = (state) => {
    if (!state) return <span style={{ color: 'var(--text-muted)' }}>null</span>;
    if (typeof state === 'object') {
      return JSON.stringify(state).replace(/[{}"]/g, ' ').trim();
    }
    return String(state);
  };

  return (
    <div className="card">
      <div className="card-header-bar">
        <div className="card-title-group">
          <h2>
            <span>📜</span> Live PL/pgSQL Database Audit Trail
          </h2>
          <p>
            Immutable event log captured via PostgreSQL trigger <code>trg_audit_resource_update</code> on state changes
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <span className="role-badge role-admin">
            PL/pgSQL Trigger Active
          </span>
          <button 
            className="btn-secondary" 
            onClick={fetchAuditLogs} 
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner" style={{ borderTopColor: 'var(--text-primary)' }}></span>
                <span>Fetching Logs...</span>
              </>
            ) : (
              <>
                <span>🔄</span>
                <span>Refresh Trail</span>
              </>
            )}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="error-banner">
          <span>⚠️</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Compliance Log Table */}
      <div className="table-responsive">
        <table>
          <thead>
            <tr>
              <th style={{ width: '90px' }}>Log ID</th>
              <th style={{ width: '110px' }}>Entity</th>
              <th style={{ width: '110px' }}>Record ID</th>
              <th style={{ width: '100px' }}>Action</th>
              <th>Trigger State Transition (Old ➔ New)</th>
              <th style={{ width: '160px' }}>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan="6">
                  <div className="empty-state-card">
                    <div className="empty-state-icon">🛡️</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                      No Audit Records Logged Yet
                    </div>
                    <div style={{ fontSize: '0.85rem' }}>
                      Perform an emergency unit allocation or release in Step 3 (Dispatcher) to fire the PostgreSQL trigger!
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              logs.map((l, idx) => (
                <tr key={l.log_id || idx}>
                  <td>
                    <span className="code-chip" style={{ fontWeight: 700 }}>
                      #{l.log_id}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {l.entity_name}
                    </span>
                  </td>
                  <td>
                    <span className="code-chip">
                      Unit #{l.record_id}
                    </span>
                  </td>
                  <td>
                    <span className="role-badge role-dispatcher" style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}>
                      {l.action}
                    </span>
                  </td>
                  <td>
                    <div className="state-transition-cell">
                      <span className="code-chip" title="Previous State">
                        {renderStateJson(l.old_state)}
                      </span>
                      <span className="transition-arrow">➔</span>
                      <span className="code-chip" style={{ borderColor: 'var(--crimson-border)', color: 'var(--text-primary)' }} title="New Committed State">
                        {renderStateJson(l.new_state)}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                      {l.changed_at ? new Date(l.changed_at).toLocaleString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: 'short' }) : 'N/A'}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}