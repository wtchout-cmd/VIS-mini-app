import React, { useState, useRef, useCallback, useEffect } from 'react';
import { uploadRatecon, assignDriver } from '../api/tms.js';
import './RateconModal.css';

/**
 * RateconModal — 5 states:
 *  upload → processing → review → driver-select → success
 */
const RateconModal = ({ isOpen, onClose, drivers = [], telegramUserId, clientPrefix, onAssigned }) => {
  const [flow, setFlow] = useState('upload');
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);

  // Extracted load data from AI + sessionKey for Redis
  const [loadData, setLoadData] = useState(null);
  const [sessionKey, setSessionKey] = useState(null);

  // Driver selection
  const [searchQuery, setSearchQuery] = useState('');
  const [assigning, setAssigning] = useState(false);

  const fileInputRef = useRef(null);

  const reset = useCallback(() => {
    setFlow('upload');
    setFile(null);
    setDragActive(false);
    setError(null);
    setLoadData(null);
    setSessionKey(null);
    setSearchQuery('');
    setAssigning(false);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  // ── File Processing ──────────────────────────────────────────────────────
  const processFile = useCallback(async (f) => {
    const valid = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!valid.includes(f.type)) {
      setError('Please upload a PDF or image file (PNG, JPG, WEBP).');
      return;
    }

    setFile(f);
    setError(null);
    setFlow('processing');

    try {
      const result = await uploadRatecon(f, telegramUserId, clientPrefix);

      if (!result?.sessionKey || !result?.loadData) {
        throw new Error(result?.message || 'Invalid response from server. Check n8n webhook.');
      }

      setSessionKey(result.sessionKey);
      setLoadData(result.loadData);
      setFlow('review');
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to process rate confirmation. Please try again.');
      setFlow('upload');
    }
  }, [telegramUserId, clientPrefix]);

  // ── Drag & Drop ──────────────────────────────────────────────────────────
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) processFile(dropped);
  }, [processFile]);

  const handlePaste = useCallback((e) => {
    for (const item of e.clipboardData?.items ?? []) {
      if (item.type.startsWith('image/')) {
        processFile(item.getAsFile());
        break;
      }
    }
  }, [processFile]);

  useEffect(() => {
    if (isOpen && flow === 'upload') {
      window.addEventListener('paste', handlePaste);
      return () => window.removeEventListener('paste', handlePaste);
    }
  }, [isOpen, flow, handlePaste]);

  // ── Driver Assignment ────────────────────────────────────────────────────
  const handleDriverSelect = useCallback(async (driver) => {
    setAssigning(true);
    setError(null);

    try {
      await assignDriver({
        sessionKey,
        truckId:       driver.rawTruckId,
        driverName:    driver.name,
        driverChatId:  driver.telegramId || null,
        groupChatId:   import.meta.env.VITE_DRIVER_GROUP_CHAT_ID,
        telegramUserId,
      });

      setFlow('success');
      onAssigned?.();
    } catch (err) {
      console.error('Assign error:', err);
      setError('Failed to assign driver. ' + (err.message || ''));
      setAssigning(false);
    }
  }, [sessionKey, telegramUserId, onAssigned]);

  // ── Filtered Drivers ─────────────────────────────────────────────────────
  const filteredDrivers = drivers.filter(d =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.vehicle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.status?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {flow !== 'upload' && flow !== 'processing' && flow !== 'success' && (
              <button
                className="back-btn"
                onClick={() => {
                  if (flow === 'driver-select') setFlow('review');
                  else if (flow === 'review') { setFlow('upload'); setLoadData(null); setSessionKey(null); }
                }}
              >
                ←
              </button>
            )}
            <h2>
              {{ upload: 'Upload Rate Confirmation', processing: 'Processing…', review: 'Verify Load Data', 'driver-select': 'Select Driver', success: 'Load Assigned ✅' }[flow]}
            </h2>
          </div>
          <button className="close-btn" onClick={handleClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* ── Error Banner ────────────────────────────────────────────── */}
        {error && (
          <div className="error-banner">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span>{error}</span>
            <button className="retry-btn" onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}

        {/* ── STATE: Upload ────────────────────────────────────────────── */}
        {flow === 'upload' && (
          <div className="upload-container">
            <div
              className={`dropzone ${dragActive ? 'drag-active' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="dropzone-icon">
                <svg width="48" height="48" viewBox="0 0 64 64" fill="none">
                  <path d="M32 16V48M16 32H48" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
                </svg>
              </div>
              <h3>Drop rate confirmation here</h3>
              <p>PDF, PNG, JPG, WEBP</p>
              <p className="paste-hint">Or Ctrl+V to paste a screenshot</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              onChange={e => e.target.files?.[0] && processFile(e.target.files[0])}
              style={{ display: 'none' }}
            />
          </div>
        )}

        {/* ── STATE: Processing ────────────────────────────────────────── */}
        {flow === 'processing' && (
          <div className="processing-state">
            <div className="spinner" />
            <p>AI is extracting load data…</p>
            <span className="file-name">{file?.name}</span>
            <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
              This usually takes 5–15 seconds
            </p>
          </div>
        )}

        {/* ── STATE: Review ────────────────────────────────────────────── */}
        {flow === 'review' && loadData && (
          <div className="review-container">
            <div className="review-field-group">
              <div className="review-row">
                <span className="review-label">Load #</span>
                <span className="review-value highlight">{loadData.loadNumber || '—'}</span>
              </div>
              <div className="review-row">
                <span className="review-label">Broker</span>
                <span className="review-value">{loadData.broker || '—'}</span>
              </div>
              <div className="review-row">
                <span className="review-label">Commodity</span>
                <span className="review-value">{loadData.commodity || '—'}</span>
              </div>
              <div className="review-row">
                <span className="review-label">Weight</span>
                <span className="review-value">{loadData.weight || '—'}</span>
              </div>
            </div>

            <div className="review-stops">
              {(loadData.pickupStops || []).map((stop, i) => (
                <div key={`pu-${i}`} className="stop-card pickup">
                  <div className="stop-type">📍 PU {i + 1}</div>
                  <div className="stop-location">{stop.location}</div>
                  <div className="stop-address">{stop.address}</div>
                  <div className="stop-time">⏱ {stop.datetime}</div>
                </div>
              ))}
              {(loadData.deliveryStops || []).map((stop, i) => (
                <div key={`del-${i}`} className="stop-card delivery">
                  <div className="stop-type">🏁 DEL {i + 1}</div>
                  <div className="stop-location">{stop.location}</div>
                  <div className="stop-address">{stop.address}</div>
                  <div className="stop-time">⏱ {stop.datetime}</div>
                </div>
              ))}
            </div>

            <div className="review-financials">
              <div className="fin-box">
                <div className="fin-label">Rate</div>
                <div className="fin-value green">${Number(loadData.rate || 0).toLocaleString()}</div>
              </div>
              <div className="fin-box">
                <div className="fin-label">Miles</div>
                <div className="fin-value">{loadData.distance || '—'}</div>
              </div>
              <div className="fin-box">
                <div className="fin-label">$/mi</div>
                <div className="fin-value">
                  {loadData.distance && loadData.rate
                    ? `$${(loadData.rate / loadData.distance).toFixed(2)}`
                    : '—'}
                </div>
              </div>
            </div>

            <button className="confirm-btn" onClick={() => setFlow('driver-select')}>
              Confirm & Select Driver →
            </button>
          </div>
        )}

        {/* ── STATE: Driver Select ─────────────────────────────────────── */}
        {flow === 'driver-select' && (
          <div className="driver-select-container">
            <div className="search-bar">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="2"/>
                <path d="M14 14L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <input
                type="text"
                placeholder="Search driver or truck…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>

            <div className="driver-list">
              {assigning && (
                <div className="processing-state" style={{ minHeight: '160px' }}>
                  <div className="spinner" />
                  <p>Assigning driver…</p>
                </div>
              )}
              {!assigning && filteredDrivers.length === 0 && (
                <div className="no-results">
                  <p>No drivers found</p>
                  <span>Try a different search</span>
                </div>
              )}
              {!assigning && filteredDrivers.map(driver => (
                <div
                  key={driver.rawTruckId || driver.id}
                  className="driver-item"
                  onClick={() => handleDriverSelect(driver)}
                >
                  <div className="driver-avatar" style={{ borderColor: driver.color, color: driver.color, background: `${driver.color}20` }}>
                    {driver.id}
                  </div>
                  <div className="driver-info">
                    <h4>{driver.name}</h4>
                    <span className="driver-vehicle">{driver.vehicle}</span>
                    {driver.location && <span className="driver-location">📍 {driver.location}</span>}
                  </div>
                  <div className="driver-status">
                    <span className="status-badge" style={{ background: `${driver.color}20`, color: driver.color }}>
                      {driver.status}
                    </span>
                    {driver.driverType && (
                      <span style={{ fontSize: '10px', color: '#6b7280', marginTop: '4px' }}>
                        {driver.driverType}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── STATE: Success ───────────────────────────────────────────── */}
        {flow === 'success' && (
          <div className="processing-state">
            <div style={{ fontSize: '56px', marginBottom: '16px' }}>✅</div>
            <p style={{ fontSize: '18px', fontWeight: '600' }}>Load Assigned!</p>
            <span style={{ fontSize: '13px', color: '#8b92a7', marginTop: '8px' }}>
              Driver group notified. Dashboard updated.
            </span>
            <button
              className="confirm-btn"
              style={{ marginTop: '24px', width: '100%' }}
              onClick={handleClose}
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RateconModal;
