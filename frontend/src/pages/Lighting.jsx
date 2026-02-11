import React from 'react';
import LightingControlPanel from '../components/lighting/LightingControlPanel';
import LightingChart from '../components/charts/LightingChart';
import Panel from '../components/common/Panel';
import StatusBadge from '../components/common/StatusBadge';
import { useSmartHome } from '../contexts/SmartHomeContext';
import { formatLux, formatPercent, formatRelativeTime } from '../utils/formatters';

export default function Lighting() {
  const {
    deviceIds,
    latestLighting,
    lightingData,
    setDimmer,
    setDaylightHarvest,
    setRelay,
    loading,
    lastCommand,
    refreshLightingSnapshot,
  } = useSmartHome();

  return (
    <div className="page-stack">
      <section className="split-grid">
        <Panel
          title="Lighting Control"
          subtitle={`Control target device: ${deviceIds.lighting}`}
          actions={
            <button className="btn btn-ghost btn-small" type="button" onClick={refreshLightingSnapshot}>
              Refresh status
            </button>
          }
        >
          <LightingControlPanel
            lightingState={latestLighting}
            loading={loading.commands}
            onSetDimmer={setDimmer}
            onSetDaylightHarvest={setDaylightHarvest}
            onSetRelay={setRelay}
            lastCommand={lastCommand}
          />
        </Panel>

        <Panel title="Current Device State" subtitle="Live state snapshot and telemetry flags">
          {latestLighting ? (
            <div className="status-list">
              <div className="status-row">
                <span>Ambient level</span>
                <strong>{formatPercent(latestLighting.light_level, 1)}</strong>
              </div>
              <div className="status-row">
                <span>Ambient lux</span>
                <strong>{formatLux(latestLighting.light_lux, 0)}</strong>
              </div>
              <div className="status-row">
                <span>Dimmer output</span>
                <strong>{formatPercent(latestLighting.dimmer_brightness, 0)}</strong>
              </div>
              <div className="status-row">
                <span>Daylight harvesting</span>
                <StatusBadge tone={latestLighting.daylight_harvest_mode ? 'success' : 'neutral'}>
                  {latestLighting.daylight_harvest_mode ? 'ENABLED' : 'DISABLED'}
                </StatusBadge>
              </div>
              <div className="status-row">
                <span>Relay map</span>
                <div className="relay-inline">
                  {latestLighting.relays.map((relay, index) => (
                    <StatusBadge key={`relay-inline-${index}`} tone={relay ? 'success' : 'neutral'}>
                      R{index + 1}: {relay ? 'ON' : 'OFF'}
                    </StatusBadge>
                  ))}
                </div>
              </div>
              <div className="status-row">
                <span>Last telemetry point</span>
                <span>{formatRelativeTime(latestLighting.timestamp)}</span>
              </div>
            </div>
          ) : (
            <div className="empty-state">No lighting state has been received yet.</div>
          )}
        </Panel>
      </section>

      <Panel title="Lighting Timeline" subtitle="Ambient level, lux, and dimmer changes over time">
        <LightingChart data={lightingData} height={360} />
      </Panel>
    </div>
  );
}

