import React from 'react';
import EnvironmentalChart from '../components/charts/EnvironmentalChart';
import LightingChart from '../components/charts/LightingChart';
import AccessLogTable from '../components/access/AccessLogTable';
import MetricCard from '../components/common/MetricCard';
import Panel from '../components/common/Panel';
import StatusBadge from '../components/common/StatusBadge';
import { useSmartHome } from '../contexts/SmartHomeContext';
import {
  formatLux,
  formatPercent,
  formatRelativeTime,
  formatTempC,
  formatTimestamp,
} from '../utils/formatters';

export default function Dashboard() {
  const {
    accessLogs,
    connectedDevices,
    environmentalData,
    health,
    latestEnvironmental,
    latestLighting,
    lightingData,
    usingSyntheticFeed,
    wsStatus,
    refreshAll,
    loading,
  } = useSmartHome();

  const recentAccess = accessLogs.slice(0, 8);

  return (
    <div className="page-stack">
      <section className="metric-grid">
        <MetricCard
          label="Temperature"
          value={latestEnvironmental ? formatTempC(latestEnvironmental.temperature) : '--'}
          subtext={latestEnvironmental ? `Updated ${formatRelativeTime(latestEnvironmental.timestamp)}` : 'Waiting for sensor stream'}
          accent="cyan"
        />
        <MetricCard
          label="Humidity"
          value={latestEnvironmental ? formatPercent(latestEnvironmental.humidity, 1) : '--'}
          subtext={latestEnvironmental ? `Pressure ${latestEnvironmental.pressure.toFixed(1)} hPa` : 'No environmental sample yet'}
          accent="amber"
        />
        <MetricCard
          label="Ambient Light"
          value={latestLighting ? formatLux(latestLighting.light_lux, 0) : '--'}
          subtext={latestLighting ? `${formatPercent(latestLighting.light_level, 0)} ambient level` : 'No lighting telemetry yet'}
          accent="green"
        />
        <MetricCard
          label="Dimmer"
          value={latestLighting ? formatPercent(latestLighting.dimmer_brightness, 0) : '--'}
          subtext={
            latestLighting?.daylight_harvest_mode
              ? 'Daylight harvesting enabled'
              : 'Manual brightness mode'
          }
          accent="violet"
        />
      </section>

      <section className="split-grid">
        <Panel
          title="Environmental Monitoring"
          subtitle="Live temperature, humidity, and pressure telemetry"
        >
          <EnvironmentalChart data={environmentalData} />
        </Panel>

        <Panel
          title="Lighting Monitoring"
          subtitle="Ambient light, lux estimation, and dimmer behavior"
        >
          <LightingChart data={lightingData} />
        </Panel>
      </section>

      <section className="split-grid">
        <Panel
          title="System Status"
          subtitle="Backend health, websocket state, and connected devices"
          actions={
            <button
              className="btn btn-ghost btn-small"
              type="button"
              onClick={() => refreshAll()}
              disabled={loading.health}
            >
              Refresh
            </button>
          }
        >
          <div className="status-list">
            <div className="status-row">
              <span>Backend health</span>
              <StatusBadge tone={health.status === 'healthy' ? 'success' : 'warning'}>
                {health.status?.toUpperCase() || 'UNKNOWN'}
              </StatusBadge>
            </div>
            <div className="status-row">
              <span>Redis</span>
              <StatusBadge tone={health.services?.redis === 'connected' ? 'success' : 'neutral'}>
                {(health.services?.redis || 'unknown').toUpperCase()}
              </StatusBadge>
            </div>
            <div className="status-row">
              <span>Database</span>
              <StatusBadge
                tone={health.services?.database === 'connected' ? 'success' : 'neutral'}
              >
                {(health.services?.database || 'unknown').toUpperCase()}
              </StatusBadge>
            </div>
            <div className="status-row">
              <span>WebSocket stream</span>
              <StatusBadge tone={wsStatus === 'connected' ? 'success' : 'warning'}>
                {wsStatus.toUpperCase()}
              </StatusBadge>
            </div>
            <div className="status-row">
              <span>Connected devices</span>
              <StatusBadge tone={connectedDevices.length ? 'success' : 'info'}>
                {connectedDevices.length ? connectedDevices.join(', ') : 'NONE'}
              </StatusBadge>
            </div>
            <div className="status-row">
              <span>Data source</span>
              <StatusBadge tone={usingSyntheticFeed ? 'warning' : 'success'}>
                {usingSyntheticFeed ? 'SYNTHETIC FALLBACK' : 'LIVE STREAM'}
              </StatusBadge>
            </div>
            <div className="status-row">
              <span>Last backend report</span>
              <span>{health.timestamp ? formatTimestamp(health.timestamp) : 'Unknown'}</span>
            </div>
          </div>
        </Panel>

        <Panel title="Recent Access Attempts" subtitle="Latest RFID authorization results">
          <AccessLogTable logs={recentAccess} maxRows={8} />
        </Panel>
      </section>
    </div>
  );
}
