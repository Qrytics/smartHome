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

export default function EnvironmentalChart({ data, height = 300, showPressure = true }) {
  const chartData = useMemo(
    () =>
      data.map((point) => ({
        ...point,
        timeLabel: formatShortTime(point.timestamp),
      })),
    [data]
  );

  if (!chartData.length) {
    return <div className="empty-state">No environmental data available yet.</div>;
  }

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
          <XAxis dataKey="timeLabel" tick={{ fill: 'rgba(255,255,255,0.75)', fontSize: 12 }} />
          <YAxis
            yAxisId="temperature"
            tick={{ fill: 'rgba(255,255,255,0.75)', fontSize: 12 }}
            domain={['auto', 'auto']}
          />
          <YAxis
            yAxisId="humidity"
            orientation="right"
            tick={{ fill: 'rgba(255,255,255,0.75)', fontSize: 12 }}
            domain={[0, 100]}
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
            yAxisId="temperature"
            type="monotone"
            dataKey="temperature"
            stroke="#67e8f9"
            strokeWidth={2}
            dot={false}
            name="Temperature (C)"
          />
          <Line
            yAxisId="humidity"
            type="monotone"
            dataKey="humidity"
            stroke="#facc15"
            strokeWidth={2}
            dot={false}
            name="Humidity (%)"
          />
          {showPressure ? (
            <Line
              yAxisId="temperature"
              type="monotone"
              dataKey="pressure"
              stroke="#34d399"
              strokeWidth={1.75}
              dot={false}
              name="Pressure (hPa)"
            />
          ) : null}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

