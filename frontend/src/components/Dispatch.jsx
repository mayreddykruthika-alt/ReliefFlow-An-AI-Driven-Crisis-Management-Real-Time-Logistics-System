import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// Exactly matched with your PostgreSQL resources table (IDs 1 to 10)
const EMERGENCY_FLEET = [
  { id: 1, name: "NDRF Rescue Unit 1", type: "Rescue Boat", icon: "🚤", capacity: 5 },
  { id: 2, name: "Central Fire Station", type: "Fire Engine", icon: "🚒", capacity: 3 },
  { id: 3, name: "Emergency Response", type: "Ambulance", icon: "🚑", capacity: 2 },
  { id: 4, name: "Flood Relief Team", type: "Rescue Boat", icon: "🚤", capacity: 4 },
  { id: 5, name: "Aerial Rescue Service", type: "Helicopter", icon: "🚁", capacity: 6 },
  { id: 6, name: "Response Engine 2", type: "Fire Engine", icon: "🚒", capacity: 4 },
  { id: 7, name: "Trauma Rapid Express 2", type: "Ambulance", icon: "🚑", capacity: 2 },
  { id: 8, name: "Military Relief Unit 2", type: "Helicopter", icon: "🚁", capacity: 6 },
  { id: 9, name: "Rations Logistics Truck 1", type: "Supply Truck", icon: "🚚", capacity: 10 },
  { id: 10, name: "Rapid Relief Supply Truck 2", type: "Supply Truck", icon: "🚚", capacity: 10 },
];

export default function Dispatch({ API_URL, token }) {
  const [incidents, setIncidents] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState("1");
  const [selectedResource, setSelectedResource] = useState("1");
  const [statusMsg, setStatusMsg] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchDropdownData = useCallback(async () => {
    try {
      const incRes = await axios.post(
        `${API_URL}/api/v1/incidents/semantic-search`, 
        { query_text: "emergency flood fire rescue", top_k: 20 }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (incRes.data && incRes.data.matches && incRes.data.matches.length > 0) {
        setIncidents(incRes.data.matches);
        setSelectedIncident(String(incRes.data.matches[0].incident_id));
      }
    } catch (err) {
      console.error("Error loading incidents:", err);
    }
  }, [API_URL, token]);

  useEffect(() => {
    if (token) fetchDropdownData();
  }, [token, fetchDropdownData]);

  const handleAllocate = async () => {
    if (!selectedIncident || !selectedResource) {
      setStatusMsg("Please enter valid Incident ID and Resource ID.");
      setIsSuccess(false);
      return;
    }
    setLoading(true);
    setStatusMsg("Executing pessimistic row lock (FOR UPDATE)...");
    try {
      const res = await axios.post(
        `${API_URL}/api/v1/dispatch/allocate`, 
        { 
          incident_id: parseInt(selectedIncident, 10), 
          resource_id: parseInt(selectedResource, 10) 
        }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStatusMsg(res.data.message || "SUCCESS: Unit allocated under lock.");
      setIsSuccess(true);
    } catch (err) { 
      setStatusMsg(err.response?.data?.detail || "Allocation failed.");
      setIsSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  const handleRelease = async () => {
    if (!selectedIncident || !selectedResource) {
      setStatusMsg("Please enter valid Incident ID and Resource ID.");
      setIsSuccess(false);
      return;
    }
    setLoading(true);
    setStatusMsg("Releasing unit state...");
    try {
      const res = await axios.post(
        `${API_URL}/api/v1/dispatch/release`, 
        { 
          incident_id: parseInt(selectedIncident, 10), 
          resource_id: parseInt(selectedResource, 10) 
        }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStatusMsg(res.data.message || "SUCCESS: Unit restored to Available.");
      setIsSuccess(true);
    } catch (err) { 
      setStatusMsg(err.response?.data?.detail || "Release failed.");
      setIsSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  const selectedFleetUnit = EMERGENCY_FLEET.find(
    u => u.id === parseInt(selectedResource, 10)
  );

  return (
    <div className="card">
      <div className="card-header-bar">
        <div className="card-title-group">
          <h2>
            <span>🔒</span> Resource Locking & Allocation Engine (<code>FOR UPDATE</code>)
          </h2>
          <p>
            Pessimistic row-level transaction allocation engine mapped directly to PostgreSQL records
          </p>
        </div>
        <span className="role-badge role-dispatcher" style={{ alignSelf: 'flex-start' }}>
          ACID Concurrency Protected
        </span>
      </div>

      {/* Active Resource Legend Box */}
      <div className="resource-legend-card">
        <div className="legend-header">
          <div className="legend-title">
            <span>📋</span> Active Emergency Resource Directory
          </div>
          <div className="legend-tag">
            Click any resource card below to pre-select its ID
          </div>
        </div>

        <div className="resource-grid">
          {EMERGENCY_FLEET.map(unit => {
            const isSelected = parseInt(selectedResource, 10) === unit.id;
            return (
              <div 
                key={unit.id}
                className={`resource-item-box ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelectedResource(unit.id.toString())}
              >
                <div className="resource-info">
                  <div className="resource-id-tag">
                    RESOURCE ID: #{unit.id}
                  </div>
                  <div className="resource-name">
                    {unit.name}
                  </div>
                  <div className="resource-meta">
                    <span className="resource-type-chip">
                      {unit.icon} {unit.type}
                    </span>
                    <span>• Cap: {unit.capacity}</span>
                  </div>
                </div>

                <div className="resource-select-indicator">
                  {isSelected ? "● SELECTED" : "SELECT"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Allocation Controls */}
      <div className="allocation-controls-box">
        <div className="controls-grid">
          {/* Target Incident Selection */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="incident-select">Target Incident (Loaded from PostgreSQL):</label>
            {incidents.length > 0 ? (
              <select 
                id="incident-select"
                value={selectedIncident} 
                onChange={e => setSelectedIncident(e.target.value)}
              >
                {incidents.map(inc => (
                  <option key={inc.incident_id} value={inc.incident_id}>
                    #{inc.incident_id} — {inc.description.substring(0, 48)}... ({inc.severity})
                  </option>
                ))}
              </select>
            ) : (
              <input 
                id="incident-select"
                type="number" 
                value={selectedIncident} 
                onChange={e => setSelectedIncident(e.target.value)} 
                placeholder="Enter Incident ID (e.g. 1)" 
              />
            )}
          </div>

          {/* Resource ID Input & Indicator */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="resource-input">
              Target Resource ID (1 - 10):
              {selectedFleetUnit && (
                <span style={{ color: 'var(--crimson)', marginLeft: '0.4rem', fontWeight: 600 }}>
                  ({selectedFleetUnit.icon} {selectedFleetUnit.name})
                </span>
              )}
            </label>
            <input 
              id="resource-input"
              type="number" 
              min="1" 
              max="10" 
              value={selectedResource} 
              onChange={e => setSelectedResource(e.target.value)} 
              placeholder="Select or enter ID (1-10)" 
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="dispatch-actions-row">
          <button 
            className="btn-primary" 
            onClick={handleAllocate} 
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                <span>Locking Row...</span>
              </>
            ) : (
              <>
                <span>🔒</span>
                <span>Allocate Unit (FOR UPDATE Lock)</span>
              </>
            )}
          </button>

          <button 
            className="btn-success" 
            onClick={handleRelease} 
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                <span>Releasing...</span>
              </>
            ) : (
              <>
                <span>🔓</span>
                <span>Free Unit (Re-allocate)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {statusMsg && (
        <div className={`feedback-card ${isSuccess ? 'feedback-success' : 'feedback-failure'}`}>
          <span style={{ fontSize: '1.25rem' }}>
            {isSuccess ? '✅' : '⚠️'}
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>
              {isSuccess ? 'Database Lock Confirmation' : 'Transaction Alert'}
            </div>
            <div>{statusMsg}</div>
          </div>
        </div>
      )}
    </div>
  );
}