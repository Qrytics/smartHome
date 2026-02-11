import React from 'react';
import StatusBadge from '../common/StatusBadge';
import { formatMs, formatTimestamp } from '../../utils/formatters';

export default function AccessLogTable({ logs, maxRows }) {
  const rows = Number.isFinite(maxRows) ? logs.slice(0, maxRows) : logs;

  if (!rows.length) {
    return <div className="empty-state">No access events available.</div>;
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Device</th>
            <th>Card UID</th>
            <th>User</th>
            <th>Result</th>
            <th>Latency</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((entry) => (
            <tr key={entry.id}>
              <td>{formatTimestamp(entry.timestamp)}</td>
              <td>{entry.device_id}</td>
              <td className="mono">{entry.card_uid || 'Unknown'}</td>
              <td>{entry.user_name || 'Unknown'}</td>
              <td>
                <StatusBadge tone={entry.granted ? 'success' : 'danger'}>
                  {entry.granted ? 'GRANTED' : 'DENIED'}
                </StatusBadge>
              </td>
              <td className="mono">{formatMs(entry.latency_ms || 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

