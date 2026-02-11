import React from 'react';

export default function MetricCard({ label, value, subtext, accent = 'default' }) {
  return (
    <article className={`metric-card metric-${accent}`}>
      <p className="metric-label">{label}</p>
      <p className="metric-value">{value}</p>
      {subtext ? <p className="metric-subtext">{subtext}</p> : null}
    </article>
  );
}

