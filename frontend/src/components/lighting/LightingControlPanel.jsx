import React, { useEffect, useMemo, useState } from 'react';
import StatusBadge from '../common/StatusBadge';

const RELAY_LABELS = ['Main Lights', 'Secondary Lights', 'HVAC Fan', 'Spare Channel'];

export default function LightingControlPanel({
  lightingState,
  loading,
  onSetDimmer,
  onSetDaylightHarvest,
  onSetRelay,
  lastCommand,
}) {
  const [pendingBrightness, setPendingBrightness] = useState(
    Number(lightingState?.dimmer_brightness || 0)
  );

  const relayStates = useMemo(
    () => (Array.isArray(lightingState?.relays) ? lightingState.relays.slice(0, 4) : [false, false, false, false]),
    [lightingState?.relays]
  );

  useEffect(() => {
    setPendingBrightness(Number(lightingState?.dimmer_brightness || 0));
  }, [lightingState?.dimmer_brightness]);

  const daylightEnabled = Boolean(lightingState?.daylight_harvest_mode);

  async function applyBrightness() {
    await onSetDimmer(pendingBrightness);
  }

  return (
    <div className="lighting-controls">
      <div className="controls-row">
        <label className="field grow">
          <span>Dimmer Brightness</span>
          <input
            className="range-input"
            type="range"
            min={0}
            max={100}
            step={1}
            value={pendingBrightness}
            disabled={loading || daylightEnabled}
            onChange={(event) => setPendingBrightness(Number(event.target.value))}
          />
          <div className="range-meta">
            <strong>{pendingBrightness}%</strong>
            {daylightEnabled ? (
              <StatusBadge tone="info">Manual dimmer disabled while daylight harvest is enabled</StatusBadge>
            ) : null}
          </div>
        </label>
        <div className="field controls-actions">
          <span>&nbsp;</span>
          <button
            type="button"
            className="btn btn-primary"
            onClick={applyBrightness}
            disabled={loading || daylightEnabled}
          >
            Apply
          </button>
        </div>
      </div>

      <div className="controls-row">
        <label className="toggle-field">
          <input
            type="checkbox"
            checked={daylightEnabled}
            onChange={(event) => onSetDaylightHarvest(event.target.checked)}
            disabled={loading}
          />
          <span>Enable daylight harvesting</span>
        </label>
      </div>

      <div className="relay-grid">
        {relayStates.map((relayState, index) => (
          <button
            key={RELAY_LABELS[index]}
            type="button"
            className={`relay-tile${relayState ? ' relay-tile-on' : ''}`}
            onClick={() => onSetRelay(index + 1, !relayState)}
            disabled={loading}
          >
            <span className="relay-label">{RELAY_LABELS[index]}</span>
            <span className="relay-value">{relayState ? 'ON' : 'OFF'}</span>
          </button>
        ))}
      </div>

      {lastCommand ? (
        <div className="command-message">
          <StatusBadge tone="info">Last command</StatusBadge>
          <span>{lastCommand.message}</span>
        </div>
      ) : null}
    </div>
  );
}

