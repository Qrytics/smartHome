import React from 'react';

function fanIsOn(raw) {
  const v = String(raw ?? '')
    .trim()
    .toLowerCase();
  return ['true', '1', 'on', 'yes'].includes(v);
}

function fanIsOff(raw) {
  const v = String(raw ?? '')
    .trim()
    .toLowerCase();
  return ['false', '0', 'off', 'no'].includes(v);
}

function doorIsUnlocked(raw) {
  const v = String(raw ?? '')
    .trim()
    .toLowerCase();
  return ['unlocked', 'unlock', 'open'].includes(v);
}

/** Threshold input for the condition slot (compares trigger to this value). */
export function ConditionThresholdEditor({ draftRule, onChange }) {
  if (!draftRule.condition) return null;

  return (
    <div className="rule-slot-controls">
      <label className="field rule-slot-field">
        <span>Threshold</span>
        <input
          className="input"
          type="number"
          value={draftRule.threshold}
          onChange={(event) => onChange({ threshold: event.target.value })}
        />
      </label>
    </div>
  );
}

/** Action value UI inside the action slot (dimmer %, fan, door). */
export function ActionValueEditor({ draftRule, onChange }) {
  const actionKey = draftRule.action?.key;
  if (!actionKey) return null;

  if (actionKey === 'set_dimmer') {
    const numeric =
      draftRule.actionValue === ''
        ? ''
        : Math.max(0, Math.min(100, parseInt(draftRule.actionValue, 10) || 0));

    return (
      <div className="rule-slot-controls">
        <label className="field rule-slot-field">
          <span>Brightness (%)</span>
          <input
            className="input"
            type="number"
            min={0}
            max={100}
            step={1}
            inputMode="numeric"
            value={numeric}
            onChange={(event) => {
              const raw = event.target.value;
              if (raw === '') {
                onChange({ actionValue: '' });
                return;
              }
              const n = Math.max(0, Math.min(100, parseInt(raw, 10)));
              if (Number.isNaN(n)) return;
              onChange({ actionValue: String(n) });
            }}
          />
        </label>
      </div>
    );
  }

  if (actionKey === 'set_fan') {
    const on = fanIsOn(draftRule.actionValue);
    const off = fanIsOff(draftRule.actionValue);
    return (
      <div className="rule-slot-controls">
        <span className="rule-slot-inline-label">Fan state</span>
        <div className="rule-action-toggle-row rule-slot-toggle-row" role="group" aria-label="Fan on or off">
          <button
            type="button"
            className={`btn btn-small ${on ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => onChange({ actionValue: 'true' })}
          >
            On
          </button>
          <button
            type="button"
            className={`btn btn-small ${off ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => onChange({ actionValue: 'false' })}
          >
            Off
          </button>
        </div>
      </div>
    );
  }

  if (actionKey === 'set_door_lock') {
    const unlocked = doorIsUnlocked(draftRule.actionValue);
    const locked = !unlocked;
    return (
      <div className="rule-slot-controls">
        <span className="rule-slot-inline-label">Door state</span>
        <div className="rule-action-toggle-row rule-slot-toggle-row" role="group" aria-label="Door locked or unlocked">
          <button
            type="button"
            className={`btn btn-small ${locked ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => onChange({ actionValue: 'locked' })}
          >
            Locked
          </button>
          <button
            type="button"
            className={`btn btn-small ${unlocked ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => onChange({ actionValue: 'unlocked' })}
          >
            Unlocked
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rule-slot-controls">
      <label className="field rule-slot-field">
        <span>Action value</span>
        <input
          className="input"
          type="text"
          value={draftRule.actionValue}
          onChange={(event) => onChange({ actionValue: event.target.value })}
        />
      </label>
    </div>
  );
}
