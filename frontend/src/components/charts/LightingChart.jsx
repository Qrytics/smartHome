import React, { useMemo } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatShortTime } from '../../utils/formatters';

export default function LightingChart({ data, height = 300 }) {
  const chartData = useMemo(
    () =>
      data.map((point) => ({
        ...point,
        timeLabel: formatShortTime(point.timestamp),
      })),
    [data]
  );

  if (!chartData.length) {
    return <div className="empty-state">No lighting telemetry available yet.</div>;
  }

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
          <XAxis dataKey="timeLabel" tick={{ fill: 'rgba(255,255,255,0.75)', fontSize: 12 }} />
          <YAxis
            yAxisId="left"
            tick={{ fill: 'rgba(255,255,255,0.75)', fontSize: 12 }}
            domain={[0, 100]}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: 'rgba(255,255,255,0.75)', fontSize: 12 }}
            domain={['auto', 'auto']}
          />
          <Tooltip
            contentStyle={{
              background: 'rgba(20, 24, 31, 0.94)',
              border: '1px solid rgba(255,255,255,0.14)',
              borderRadius: '10px',
              color: 'rgba(255,255,255,0.95)',
            }}
          />
          <Legend />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="light_level"
            stroke="#60a5fa"
            strokeWidth={2}
            dot={false}
            name="Ambient (%)"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="light_lux"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={false}
            name="Ambient (lux)"
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="dimmer_brightness"
            stroke="#34d399"
            strokeWidth={1.75}
            dot={false}
            name="Dimmer (%)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

