import React, { useEffect, useState } from 'react';
import Panel from '../components/common/Panel';
import StatusBadge from '../components/common/StatusBadge';
import { useAuth } from '../contexts/AuthContext';
import { useSmartHome } from '../contexts/SmartHomeContext';

function formatSessionRemaining(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}m ${String(secs).padStart(2, '0')}s`;
}

export default function Settings() {
  const {
    deviceIds,
    setDeviceIds,
    refreshAll,
    wsUrl,
    usingSyntheticFeed,
    usingPolicyFallback,
    usingAccessFallback,
  } = useSmartHome();
  const {
    isAuthenticated,
    username,
    sessionRemainingSeconds,
    login,
    logout,
    extendSession,
  } = useAuth();

  const [draftDeviceIds, setDraftDeviceIds] = useState(deviceIds);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setDraftDeviceIds(deviceIds);
  }, [deviceIds]);

  async function handleSaveDeviceIds() {
    setDeviceIds(draftDeviceIds);
    await refreshAll();
    setNotice('Device IDs saved and dashboard data refreshed.');
    setError('');
  }

  async function handleLogin(event) {
    event.preventDefault();
    setNotice('');
    setError('');

    const response = await login(loginForm.username, loginForm.password);
    if (!response.ok) {
      setError(response.error || 'Unable to log in.');
      return;
    }

    setLoginForm({ username: '', password: '' });
    setNotice('Admin session created for 30 minutes.');
  }

  return (
    <div className="page-stack">
      <section className="split-grid">
        <Panel title="Device Configuration" subtitle="Update frontend target device IDs">
          <div className="form-grid">
            <label className="field">
              <span>Environmental device ID</span>
              <input
                className="input"
                type="text"
                value={draftDeviceIds.environmental}
                onChange={(event) =>
                  setDraftDeviceIds((prev) => ({ ...prev, environmental: event.target.value }))
                }
                placeholder="sensor-monitor-01"
              />
            </label>

            <label className="field">
              <span>Lighting device ID</span>
              <input
                className="input"
                type="text"
                value={draftDeviceIds.lighting}
                onChange={(event) =>
                  setDraftDeviceIds((prev) => ({ ...prev, lighting: event.target.value }))
                }
                placeholder="lighting-control-01"
              />
            </label>

            <label className="field">
              <span>Door device ID</span>
              <input
                className="input"
                type="text"
                value={draftDeviceIds.door}
                onChange={(event) =>
                  setDraftDeviceIds((prev) => ({ ...prev, door: event.target.value }))
                }
                placeholder="door-control-01"
              />
            </label>

            <div className="field">
              <span>&nbsp;</span>
              <div className="button-row">
                <button className="btn btn-primary" type="button" onClick={handleSaveDeviceIds}>
                  Save device IDs
                </button>
                <button className="btn btn-ghost" type="button" onClick={() => refreshAll()}>
                  Refresh all data
                </button>
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="Admin Session" subtitle="Policy management and secure operations">
          {isAuthenticated ? (
            <div className="status-list">
              <div className="status-row">
                <span>Signed in as</span>
                <StatusBadge tone="success">{username}</StatusBadge>
              </div>
              <div className="status-row">
                <span>Session remaining</span>
                <strong>{formatSessionRemaining(sessionRemainingSeconds)}</strong>
              </div>
              <div className="button-row">
                <button className="btn btn-ghost" type="button" onClick={extendSession}>
                  Extend 30 minutes
                </button>
                <button className="btn btn-danger" type="button" onClick={logout}>
                  Sign out
                </button>
              </div>
            </div>
          ) : (
            <form className="form-grid" onSubmit={handleLogin}>
              <label className="field">
                <span>Username</span>
                <input
                  className="input"
                  type="text"
                  value={loginForm.username}
                  onChange={(event) =>
                    setLoginForm((prev) => ({ ...prev, username: event.target.value }))
                  }
                  autoComplete="username"
                />
              </label>
              <label className="field">
                <span>Password</span>
                <input
                  className="input"
                  type="password"
                  value={loginForm.password}
                  onChange={(event) =>
                    setLoginForm((prev) => ({ ...prev, password: event.target.value }))
                  }
                  autoComplete="current-password"
                />
              </label>
              <div className="field">
                <span>&nbsp;</span>
                <button className="btn btn-primary" type="submit">
                  Sign in
                </button>
              </div>
            </form>
          )}
        </Panel>
      </section>

      <Panel title="Runtime Diagnostics" subtitle="Frontend connectivity and fallback behavior">
        <div className="status-list">
          <div className="status-row">
            <span>API URL</span>
            <span className="mono">{process.env.REACT_APP_API_URL || 'http://localhost:8000'}</span>
          </div>
          <div className="status-row">
            <span>WebSocket URL</span>
            <span className="mono">{wsUrl}</span>
          </div>
          <div className="status-row">
            <span>Synthetic telemetry</span>
            <StatusBadge tone={usingSyntheticFeed ? 'warning' : 'success'}>
              {usingSyntheticFeed ? 'Enabled (fallback mode)' : 'Disabled (live mode)'}
            </StatusBadge>
          </div>
          <div className="status-row">
            <span>Policy endpoint fallback</span>
            <StatusBadge tone={usingPolicyFallback ? 'warning' : 'success'}>
              {usingPolicyFallback ? 'Local fallback active' : 'Backend endpoint active'}
            </StatusBadge>
          </div>
          <div className="status-row">
            <span>Access endpoint fallback</span>
            <StatusBadge tone={usingAccessFallback ? 'warning' : 'success'}>
              {usingAccessFallback ? 'Local fallback active' : 'Backend endpoint active'}
            </StatusBadge>
          </div>
        </div>
      </Panel>

      {error ? <p className="form-error">{error}</p> : null}
      {notice ? <p className="form-notice">{notice}</p> : null}
    </div>
  );
}

