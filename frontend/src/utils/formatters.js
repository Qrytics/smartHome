export function toIsoTimestamp(value) {
  if (!value) return new Date().toISOString();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString();
  return parsed.toISOString();
}

export function asNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function formatTimestamp(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Unknown';

  return parsed.toLocaleString([], {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatShortTime(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '--:--';
  return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatRelativeTime(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Unknown';

  const diffMs = Date.now() - parsed.getTime();
  const diffSec = Math.max(0, Math.round(diffMs / 1000));

  if (diffSec < 10) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.round(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.round(diffSec / 3600)}h ago`;
  return `${Math.round(diffSec / 86400)}d ago`;
}

export function formatPercent(value, digits = 0) {
  return `${asNumber(value).toFixed(digits)}%`;
}

export function formatTempC(value, digits = 1) {
  return `${asNumber(value).toFixed(digits)} C`;
}

export function formatLux(value, digits = 0) {
  return `${asNumber(value).toFixed(digits)} lux`;
}

export function formatMs(value, digits = 0) {
  return `${asNumber(value).toFixed(digits)} ms`;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function computeSeriesStats(series, key) {
  const numericValues = series
    .map((entry) => Number(entry?.[key]))
    .filter((value) => Number.isFinite(value));

  if (numericValues.length === 0) {
    return {
      min: null,
      max: null,
      avg: null,
      count: 0,
    };
  }

  const min = Math.min(...numericValues);
  const max = Math.max(...numericValues);
  const sum = numericValues.reduce((acc, value) => acc + value, 0);

  return {
    min,
    max,
    avg: sum / numericValues.length,
    count: numericValues.length,
  };
}

export function filterSeriesByRange(series, startTime, endTime) {
  const startMs = startTime ? new Date(startTime).getTime() : null;
  const endMs = endTime ? new Date(endTime).getTime() : null;

  return series.filter((entry) => {
    const at = new Date(entry.timestamp || entry.time).getTime();
    if (Number.isNaN(at)) return false;
    if (startMs && at < startMs) return false;
    if (endMs && at > endMs) return false;
    return true;
  });
}

