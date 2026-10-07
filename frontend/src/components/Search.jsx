import React, { useState } from 'react';
import axios from 'axios';

export default function Search({ API_URL, token }) {
  const [query, setQuery] = useState("Water entering houses near river bank");
  const [results, setResults] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (textToSearch) => {
    const q = typeof textToSearch === 'string' ? textToSearch : query;
    if (!q.trim()) return;

    setErrorMsg("");
    setLoading(true);
    setHasSearched(true);
    try {
      const res = await axios.post(
        `${API_URL}/api/v1/incidents/semantic-search`, 
        { query_text: q, top_k: 5 }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data && res.data.matches) {
        setResults(res.data.matches);
      } else {
        setResults([]);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || "Error performing vector semantic search.");
    } finally {
      setLoading(false);
    }
  };

  const handlePresetSelect = (presetText) => {
    setQuery(presetText);
    handleSearch(presetText);
  };

  const getSeverityBadgeClass = (severity) => {
    const s = (severity || "").toLowerCase();
    if (s === 'critical') return 'severity-critical';
    if (s === 'high') return 'severity-high';
    if (s === 'medium') return 'severity-medium';
    return 'severity-low';
  };

  const getStatusBadgeClass = (status) => {
    const st = (status || "").toLowerCase();
    if (st === 'dispatched') return 'status-dispatched';
    if (st === 'resolved') return 'status-resolved';
    return 'status-pending';
  };

  const getScoreBadgeClass = (score) => {
    const percentage = score * 100;
    if (percentage >= 75) return 'match-high';
    if (percentage >= 35) return 'match-med';
    return 'match-low';
  };

  return (
    <div className="card">
      <div className="card-header-bar">
        <div className="card-title-group">
          <h2>
            <span>🔍</span> Vector Semantic Incident Search
          </h2>
          <p>
            Real-time cosine similarity search across PostgreSQL incident corpus (TF-IDF Vector Embeddings)
          </p>
        </div>
        <span className="role-badge role-dispatcher" style={{ alignSelf: 'flex-start' }}>
          TF-IDF & Cosine Similarity
        </span>
      </div>

      {/* Preset Query Chips */}
      <div className="prompt-chips-wrapper">
        <span className="prompt-chips-label">Sample Dispatches:</span>
        <button 
          type="button" 
          className="prompt-chip" 
          onClick={() => handlePresetSelect("Water entering houses near river bank")}
        >
          🌊 River Flood
        </button>
        <button 
          type="button" 
          className="prompt-chip" 
          onClick={() => handlePresetSelect("Building collapsed after heavy rainfall")}
        >
          🏚️ Building Collapse
        </button>
        <button 
          type="button" 
          className="prompt-chip" 
          onClick={() => handlePresetSelect("Gas leak reported near market area")}
        >
          ⚠️ Gas Leak
        </button>
        <button 
          type="button" 
          className="prompt-chip" 
          onClick={() => handlePresetSelect("High power electric wire snapped on flooded road")}
        >
          ⚡ Electric Wire Hazard
        </button>
      </div>

      {/* Minimalist Search Input */}
      <div className="search-bar-row">
        <input 
          type="text" 
          value={query} 
          onChange={e => setQuery(e.target.value)} 
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Enter natural language disaster query (e.g., river overflow, trapped citizens)..." 
        />
        <button 
          className="btn-primary" 
          onClick={() => handleSearch()} 
          disabled={loading}
          style={{ whiteSpace: 'nowrap' }}
        >
          {loading ? (
            <>
              <span className="spinner"></span>
              <span>Matching Vectors...</span>
            </>
          ) : (
            <>
              <span>⚡</span>
              <span>Execute Vector Search</span>
            </>
          )}
        </button>
      </div>

      {errorMsg && (
        <div className="error-banner">
          <span>⚠️</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Sleek Results Table */}
      <div className="table-responsive">
        <table>
          <thead>
            <tr>
              <th style={{ width: '80px' }}>ID</th>
              <th>Incident Description</th>
              <th style={{ width: '120px' }}>Severity</th>
              <th style={{ width: '120px' }}>Status</th>
              <th style={{ width: '150px' }}>Vector Match</th>
            </tr>
          </thead>
          <tbody>
            {results.length === 0 ? (
              <tr>
                <td colSpan="5">
                  <div className="empty-state-card">
                    <div className="empty-state-icon">📡</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                      {hasSearched ? "No direct incident matches found" : "Ready for Vector Query"}
                    </div>
                    <div style={{ fontSize: '0.85rem' }}>
                      Click 'Execute Vector Search' or a sample chip to rank incidents by cosine semantic similarity.
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              results.map(m => {
                const percentage = (m.score * 100).toFixed(1);
                return (
                  <tr key={m.incident_id}>
                    <td>
                      <span className="code-chip" style={{ fontWeight: 700 }}>
                        #{m.incident_id}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                        {m.description}
                      </div>
                    </td>
                    <td>
                      <span className={`severity-pill ${getSeverityBadgeClass(m.severity)}`}>
                        {m.severity}
                      </span>
                    </td>
                    <td>
                      <span className={`status-pill ${getStatusBadgeClass(m.status)}`}>
                        {m.status}
                      </span>
                    </td>
                    <td>
                      <span className={`match-badge ${getScoreBadgeClass(m.score)}`}>
                        <span style={{ fontSize: '0.75rem' }}>●</span>
                        <span>{percentage}%</span>
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}