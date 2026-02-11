import React, { useMemo, useState } from 'react';
import AccessLogTable from '../components/access/AccessLogTable';
import PolicyManager from '../components/access/PolicyManager';
import Panel from '../components/common/Panel';
import StatusBadge from '../components/common/StatusBadge';
import { useAuth } from '../contexts/AuthContext';
import { useSmartHome } from '../contexts/SmartHomeContext';
import { formatRelativeTime } from '../utils/formatters';

export default function AccessControl() {
  const {
    accessLogs,
    createOrCheckAccessEvent,
    createPolicyCard,
    loading,
    policyCards,
    refreshAccessLogs,
    revokePolicyCard,
    usingAccessFallback,
    usingPolicyFallback,
    deviceIds,
  } = useSmartHome();
  const { isAuthenticated } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [resultFilter, setResultFilter] = useState('all');
  const [swipeUid, setSwipeUid] = useState('');
  const [swipeNotice, setSwipeNotice] = useState('');

  const filteredLogs = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return accessLogs.filter((entry) => {
      if (resultFilter === 'granted' && !entry.granted) return false;
      if (resultFilter === 'denied' && entry.granted) return false;

      if (!normalizedSearch) return true;
      const haystack = [
        entry.card_uid,
        entry.user_name || '',
        entry.device_id,
        entry.reason || '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [accessLogs, resultFilter, searchTerm]);

  async function handleSimulateSwipe() {
    const uid = swipeUid.trim();
    if (!uid) return;
    const response = await createOrCheckAccessEvent(uid);

    if (response.granted) {
      setSwipeNotice(`Access granted for ${response.card_uid}`);
    } else {
      setSwipeNotice(`Access denied for ${response.card_uid || uid}`);
    }

    setSwipeUid('');
    refreshAccessLogs({ limit: 200 });
  }

  return (
    <div className="page-stack">
      <section className="split-grid">
        <Panel
          title="RFID Policy Management"
          subtitle={`Door endpoint: ${deviceIds.door}`}
          actions={
            <div className="row-gap-xs">
              <StatusBadge tone={isAuthenticated ? 'success' : 'warning'}>
                {isAuthenticated ? 'Admin session active' : 'Read-only until login'}
              </StatusBadge>
            </div>
          }
        >
          <PolicyManager
            cards={policyCards}
            onAddCard={createPolicyCard}
            onRemoveCard={revokePolicyCard}
            canManage={isAuthenticated}
            usingFallback={usingPolicyFallback}
            loading={loading.policies}
          />
        </Panel>

        <Panel title="Swipe Simulator" subtitle="Test authorization flow directly from dashboard">
          <div className="form-grid">
            <label className="field">
              <span>Card UID</span>
              <input
                className="input"
                type="text"
                value={swipeUid}
                onChange={(event) => setSwipeUid(event.target.value.toUpperCase())}
                placeholder="04:A3:2B:F2:1C:80"
              />
            </label>
            <div className="field">
              <span>&nbsp;</span>
              <button className="btn btn-primary" type="button" onClick={handleSimulateSwipe}>
                Simulate swipe
              </button>
            </div>
          </div>

          <div className="status-list">
            <div className="status-row">
              <span>Access data source</span>
              <StatusBadge tone={usingAccessFallback ? 'warning' : 'success'}>
                {usingAccessFallback ? 'Local fallback log store' : 'Backend access endpoint'}
              </StatusBadge>
            </div>
            <div className="status-row">
              <span>Total events</span>
              <strong>{accessLogs.length}</strong>
            </div>
            <div className="status-row">
              <span>Last event</span>
              <span>
                {accessLogs[0]?.timestamp
                  ? formatRelativeTime(accessLogs[0].timestamp)
                  : 'No events yet'}
              </span>
            </div>
          </div>

          {swipeNotice ? <p className="form-notice">{swipeNotice}</p> : null}
        </Panel>
      </section>

      <Panel
        title="Access Audit Log"
        subtitle="All granted/denied attempts with latency data"
        actions={
          <button
            className="btn btn-ghost btn-small"
            type="button"
            onClick={() => refreshAccessLogs({ limit: 200 })}
          >
            Refresh
          </button>
        }
      >
        <div className="toolbar">
          <label className="field inline">
            <span>Search</span>
            <input
              className="input"
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Card UID, user, reason..."
            />
          </label>
          <label className="field inline">
            <span>Result</span>
            <select
              className="input"
              value={resultFilter}
              onChange={(event) => setResultFilter(event.target.value)}
            >
              <option value="all">All</option>
              <option value="granted">Granted</option>
              <option value="denied">Denied</option>
            </select>
          </label>
        </div>
        <AccessLogTable logs={filteredLogs} />
      </Panel>
    </div>
  );
}

