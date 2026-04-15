import React from 'react';
import LightingControlPanel from '../components/lighting/LightingControlPanel';
import LightingChart from '../components/charts/LightingChart';
import Panel from '../components/common/Panel';
import StatusBadge from '../components/common/StatusBadge';
import SectionDataModeToggle from '../components/common/SectionDataModeToggle';
import GlossaryTerm from '../components/common/GlossaryTerm';
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
    hvacState,
    setFan,
    setHvacSetpoint,
    sectionModes,
    sectionStatus,
    setSectionMode,
  } = useSmartHome();

  return (
    <div className="page-stack">
      <section className="split-grid">
        <Panel
          title="Lighting Control"
          subtitle={`Control target device: ${deviceIds.lighting}`}
          actions={
            <div className="button-row">
              <SectionDataModeToggle
                value={sectionModes.lighting}
                onChange={(mode) => setSectionMode('lighting', mode)}
              />
              <button className="btn btn-ghost btn-small" type="button" onClick={refreshLightingSnapshot}>
                Refresh status
              </button>
            </div>
          }
        >
          {sectionStatus.lighting?.state === 'error' ? (
            <div className="form-error">Connection Error: lighting control unavailable.</div>
          ) : null}
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
                <span>
                  <GlossaryTerm
                    term="Ambient level"
                    description="Normalized light intensity percentage measured by the ambient light sensor."
                  />
                </span>
                <strong>{formatPercent(latestLighting.light_level, 1)}</strong>
              </div>
              <div className="status-row">
                <span>
                  <GlossaryTerm
                    term="Ambient lux"
                    description="Estimated illuminance in lux derived from the light sensor reading."
                  />
                </span>
                <strong>{formatLux(latestLighting.light_lux, 0)}</strong>
              </div>
              <div className="status-row">
                <span>
                  <GlossaryTerm
                    term="Dimmer output"
                    description="Current PWM brightness output level sent to the lighting dimmer."
                  />
                </span>
                <strong>{formatPercent(latestLighting.dimmer_brightness, 0)}</strong>
              </div>
              <div className="status-row">
                <span>
                  <GlossaryTerm
                    term="Daylight harvesting"
                    description="Automatic brightness mode that adjusts LED output based on ambient light."
                  />
                </span>
                <StatusBadge tone={latestLighting.daylight_harvest_mode ? 'success' : 'neutral'}>
                  {latestLighting.daylight_harvest_mode ? 'ENABLED' : 'DISABLED'}
                </StatusBadge>
              </div>
              <div className="status-row">
                <span>
                  <GlossaryTerm
                    term="Relay map"
                    description="On/off state for each relay channel controlled by the lighting node."
                  />
                </span>
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

      <Panel
        title="HVAC Control"
        subtitle="Single-room HVAC setpoint and fan command"
        actions={
          <SectionDataModeToggle
            value={sectionModes.hvac}
            onChange={(mode) => setSectionMode('hvac', mode)}
          />
        }
      >
        {sectionStatus.hvac?.state === 'error' ? (
          <div className="form-error">Connection Error: HVAC command path unavailable.</div>
        ) : null}
        <div className="form-grid">
          <label className="field">
                <span>
                  <GlossaryTerm
                    term="Setpoint (C)"
                    description="Target temperature the HVAC control loop aims to maintain."
                  />
                </span>
            <input
              className="input"
              type="number"
              value={hvacState.setpoint_c}
              onChange={(event) => setHvacSetpoint(Number(event.target.value))}
            />
          </label>
          <div className="field">
            <span>
              <GlossaryTerm
                term="Fan control"
                description="Manual override commands for the room fan actuator."
              />
            </span>
            <div className="button-row">
              <button className="btn btn-primary" type="button" onClick={() => setFan(true)} disabled={loading.commands}>
                Fan ON
              </button>
              <button className="btn btn-ghost" type="button" onClick={() => setFan(false)} disabled={loading.commands}>
                Fan OFF
              </button>
            </div>
          </div>
          <div className="status-row grow">
            <span>
              <GlossaryTerm
                term="Current temperature"
                description="Most recent measured room temperature from live telemetry or demo feed."
              />
            </span>
            <strong>
              {typeof hvacState.temperature_c === 'number'
                ? `${hvacState.temperature_c.toFixed(1)} C`
                : 'No reading yet'}
            </strong>
          </div>
          <div className="status-row grow">
            <span>
              <GlossaryTerm
                term="Fan output"
                description="Current commanded state of the fan actuator."
              />
            </span>
            <StatusBadge tone={hvacState.fan_on ? 'success' : 'neutral'}>
              {hvacState.fan_on ? 'ON' : 'OFF'}
            </StatusBadge>
          </div>
        </div>
      </Panel>
    </div>
  );
}

