function escapeCsvValue(value) {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

export function mergeSeriesForCsv(environmentalSeries, lightingSeries) {
  const rowsByTimestamp = new Map();

  environmentalSeries.forEach((entry) => {
    const timestamp = entry.timestamp || entry.time;
    if (!timestamp) return;
    const current = rowsByTimestamp.get(timestamp) || { timestamp };
    rowsByTimestamp.set(timestamp, {
      ...current,
      temperature: entry.temperature,
      humidity: entry.humidity,
      pressure: entry.pressure,
    });
  });

  lightingSeries.forEach((entry) => {
    const timestamp = entry.timestamp || entry.time;
    if (!timestamp) return;
    const current = rowsByTimestamp.get(timestamp) || { timestamp };
    rowsByTimestamp.set(timestamp, {
      ...current,
      light_level: entry.light_level,
      light_lux: entry.light_lux,
      dimmer_brightness: entry.dimmer_brightness,
      daylight_harvest_mode: entry.daylight_harvest_mode,
      relays: Array.isArray(entry.relays) ? entry.relays.join('|') : '',
    });
  });

  return [...rowsByTimestamp.values()].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

export function rowsToCsv(rows, headers) {
  const safeHeaders = headers || (rows.length > 0 ? Object.keys(rows[0]) : []);
  const lines = [safeHeaders.join(',')];

  rows.forEach((row) => {
    const line = safeHeaders.map((header) => escapeCsvValue(row[header])).join(',');
    lines.push(line);
  });

  return `${lines.join('\n')}\n`;
}

export function downloadCsvFile(filename, csvContent) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

