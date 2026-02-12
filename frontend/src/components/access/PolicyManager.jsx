import React, { useMemo, useState } from 'react';
import StatusBadge from '../common/StatusBadge';
import { formatTimestamp } from '../../utils/formatters';

function normalizeCardUid(uid) {
  const cleaned = String(uid || '')
    .toUpperCase()
    .replace(/[^A-F0-9]/g, '');
  const pairs = cleaned.match(/.{1,2}/g) || [];
  return pairs.slice(0, 8).join(':');
}

export default function PolicyManager({
  cards,
  onAddCard,
  onRemoveCard,
  canManage,
  usingFallback,
  loading,
}) {
  const [cardUid, setCardUid] = useState('');
  const [userName, setUserName] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const sortedCards = useMemo(
    () =>
      [...cards].sort(
        (a, b) => new Date(b.added_at).getTime() - new Date(a.added_at).getTime()
      ),
    [cards]
  );

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setNotice('');

    const normalizedUid = normalizeCardUid(cardUid);
    if (!normalizedUid || normalizedUid.length < 11) {
      setError('Please enter a valid card UID.');
      return;
    }

    if (!String(userName).trim()) {
      setError('Please enter a user name.');
      return;
    }

    const response = await onAddCard({
      card_uid: normalizedUid,
      user_name: userName.trim(),
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
    });

    if (!response?.ok) {
      setError(response?.error || 'Unable to add card.');
      return;
    }

    setCardUid('');
    setUserName('');
    setExpiresAt('');
    setNotice(response?.fallback ? 'Card added using local fallback store.' : 'Card added.');
  }

  async function handleRevoke(uid) {
    setError('');
    setNotice('');
    const response = await onRemoveCard(uid);
    if (!response?.ok) {
      setError(response?.error || `Unable to revoke ${uid}.`);
      return;
    }
    setNotice(response?.fallback ? 'Card revoked using local fallback store.' : 'Card revoked.');
  }

  return (
    <div className="policy-manager">
      <div className="policy-toolbar">
        {usingFallback ? (
          <StatusBadge tone="warning">Fallback policy store active</StatusBadge>
        ) : (
          <StatusBadge tone="success">Backend policy endpoint active</StatusBadge>
        )}
        {!canManage ? <StatusBadge tone="info">Read-only mode</StatusBadge> : null}
      </div>

      <form className="form-grid" onSubmit={handleSubmit}>
        <label className="field">
          <span>Card UID</span>
          <input
            className="input"
            type="text"
            value={cardUid}
            onChange={(event) => setCardUid(normalizeCardUid(event.target.value))}
            placeholder="04:A3:2B:F2:1C:80"
            disabled={!canManage || loading}
          />
        </label>

        <label className="field">
          <span>User name</span>
          <input
            className="input"
            type="text"
            value={userName}
            onChange={(event) => setUserName(event.target.value)}
            placeholder="Cardholder name"
            disabled={!canManage || loading}
          />
        </label>

        <label className="field">
          <span>Expires at (optional)</span>
          <input
            className="input"
            type="datetime-local"
            value={expiresAt}
            onChange={(event) => setExpiresAt(event.target.value)}
            disabled={!canManage || loading}
          />
        </label>

        <div className="field">
          <span>&nbsp;</span>
          <button className="btn btn-primary" type="submit" disabled={!canManage || loading}>
            Add card
          </button>
        </div>
      </form>

      {error ? <p className="form-error">{error}</p> : null}
      {notice ? <p className="form-notice">{notice}</p> : null}

      {sortedCards.length === 0 ? (
        <div className="empty-state">No policy cards configured.</div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Card UID</th>
                <th>User</th>
                <th>Added</th>
                <th>Expires</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {sortedCards.map((card) => {
                const expiresAt = card.expires_at ? new Date(card.expires_at).getTime() : null;
                const expired = Number.isFinite(expiresAt) ? Date.now() > expiresAt : false;
                const active = card.active && !expired;

                return (
                  <tr key={card.card_uid}>
                    <td className="mono">{card.card_uid}</td>
                    <td>{card.user_name}</td>
                    <td>{formatTimestamp(card.added_at)}</td>
                    <td>{card.expires_at ? formatTimestamp(card.expires_at) : 'Never'}</td>
                    <td>
                      <StatusBadge tone={active ? 'success' : 'warning'}>
                        {active ? 'ACTIVE' : 'INACTIVE'}
                      </StatusBadge>
                    </td>
                    <td className="align-right">
                      <button
                        className="btn btn-danger btn-small"
                        type="button"
                        onClick={() => handleRevoke(card.card_uid)}
                        disabled={!canManage || loading}
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

