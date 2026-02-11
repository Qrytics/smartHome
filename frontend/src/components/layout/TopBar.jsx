import React from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '../common/StatusBadge';
import { useAuth } from '../../contexts/AuthContext';
import { useSmartHome } from '../../contexts/SmartHomeContext';

function formatSessionRemaining(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
}

export default function TopBar({ title, subtitle }) {
  const { isAuthenticated, username, logout, sessionRemainingSeconds } = useAuth();
  const {
    apiReachable,
    health,
    wsStatus,
    usingPolicyFallback,
    usingAccessFallback,
    usingSyntheticFeed,
    lastMessageAt,
  } = useSmartHome();

  return (
    <header className="topbar">
      <div className="topbar-title-wrap">
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>

      <div className="topbar-controls">
        <div className="topbar-badges">
          <StatusBadge tone={apiReachable ? 'success' : 'danger'}>
            API {health?.status?.toUpperCase() || 'UNKNOWN'}
          </StatusBadge>
          <StatusBadge tone={wsStatus === 'connected' ? 'success' : 'warning'}>
            WS {wsStatus.toUpperCase()}
          </StatusBadge>
          {usingSyntheticFeed ? <StatusBadge tone="info">SIMULATED FEED</StatusBadge> : null}
          {usingPolicyFallback ? <StatusBadge tone="warning">POLICY FALLBACK</StatusBadge> : null}
          {usingAccessFallback ? <StatusBadge tone="warning">ACCESS FALLBACK</StatusBadge> : null}
        </div>

        <div className="topbar-auth">
          {lastMessageAt ? (
            <span className="topbar-last-message">Last update: {new Date(lastMessageAt).toLocaleTimeString()}</span>
          ) : null}

          {isAuthenticated ? (
            <>
              <StatusBadge tone="success">
                {username} ({formatSessionRemaining(sessionRemainingSeconds)})
              </StatusBadge>
              <button type="button" className="btn btn-ghost" onClick={logout}>
                Sign out
              </button>
            </>
          ) : (
            <Link className="btn btn-ghost" to="/settings">
              Admin login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

