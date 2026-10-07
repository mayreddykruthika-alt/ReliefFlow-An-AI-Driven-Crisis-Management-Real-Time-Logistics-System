import React, { useState } from 'react';
import axios from 'axios';

export default function Chatbot({ API_URL, token }) {
  const [prompt, setPrompt] = useState("hot water burn on skin");
  const [response, setResponse] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAsk = async (queryToAsk) => {
    const text = typeof queryToAsk === 'string' ? queryToAsk : prompt;
    if (!text.trim()) return;

    setErrorMsg("");
    setLoading(true);
    try {
      const res = await axios.post(
        `${API_URL}/api/v1/chatbot/first-aid`, 
        { user_prompt: text }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setResponse(res.data);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || "Error connecting to first-aid chatbot.");
    } finally {
      setLoading(false);
    }
  };

  const handlePresetSelect = (presetText) => {
    setPrompt(presetText);
    handleAsk(presetText);
  };

  return (
    <div className="card">
      <div className="card-header-bar">
        <div className="card-title-group">
          <h2>
            <span>🩺</span> Emergency First-Aid RAG Chatbot
          </h2>
          <p>
            Instant retrieval-augmented triage indexing life-saving protocols and critical safety restrictions
          </p>
        </div>
        <span className="role-badge role-victim" style={{ alignSelf: 'flex-start' }}>
          Database Triage Active
        </span>
      </div>

      {/* Quick Prompt Presets */}
      <div className="prompt-chips-wrapper">
        <span className="prompt-chips-label">Quick Triage Topics:</span>
        <button 
          type="button" 
          className="prompt-chip" 
          onClick={() => handlePresetSelect("hot water burn on skin")}
        >
          🔥 Hot water burn
        </button>
        <button 
          type="button" 
          className="prompt-chip" 
          onClick={() => handlePresetSelect("severe bleeding cut on arm")}
        >
          🩸 Severe bleeding
        </button>
        <button 
          type="button" 
          className="prompt-chip" 
          onClick={() => handlePresetSelect("bone fracture broken leg fall")}
        >
          🦴 Bone fracture
        </button>
        <button 
          type="button" 
          className="prompt-chip" 
          onClick={() => handlePresetSelect("choking airway obstruction food")}
        >
          🫁 Choking & airway
        </button>
      </div>

      {/* Search Input Bar */}
      <div className="prompt-bar-container">
        <input 
          type="text" 
          value={prompt} 
          onChange={e => setPrompt(e.target.value)} 
          onKeyDown={e => e.key === 'Enter' && handleAsk()}
          placeholder="Describe injury or symptoms (e.g., severe bleeding from arm, hot water burn)..." 
        />
        <button 
          className="btn-primary" 
          onClick={() => handleAsk()} 
          disabled={loading}
          style={{ whiteSpace: 'nowrap' }}
        >
          {loading ? (
            <>
              <span className="spinner"></span>
              <span>Searching...</span>
            </>
          ) : (
            <>
              <span>⚡</span>
              <span>Ask Emergency Bot</span>
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

      {/* Interactive Medical Guidance Cards */}
      {response && (
        <div className="medical-guidance-card">
          <div className="condition-header">
            <div className="condition-title">
              Diagnosed Condition:{' '}
              <span className="condition-name-highlight">
                {response.condition}
              </span>
            </div>
            <span className={`role-badge ${response.found ? 'role-victim' : 'role-guest'}`}>
              {response.found ? 'Exact Knowledge Match' : 'General First-Aid Protocol'}
            </span>
          </div>

          {/* Green Highlight Box: Step-by-Step Actions */}
          <div className="callout-recommended">
            <div className="callout-header-green">
              <span>✅</span> Recommended Step-by-Step First-Aid Actions
            </div>
            <p>{response.steps}</p>
          </div>

          {/* Red Highlight Box: Critical Warnings (DO NOT) */}
          <div className="callout-warning">
            <div className="callout-header-red">
              <span>⛔</span> Critical Warnings (DO NOT Actions)
            </div>
            <p>{response.do_not}</p>
          </div>
        </div>
      )}
    </div>
  );
}