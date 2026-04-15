import React from 'react';

export default function RuleInspector({ draftRule, onChange, onSave, onLoadDefault, loading }) {
  return (
    <div className="rule-inspector">
      <label className="field">
        <span>Rule name</span>
        <input
          className="input"
          type="text"
          value={draftRule.name}
          onChange={(event) => onChange({ ...draftRule, name: event.target.value })}
          placeholder="Auto dim when room is bright"
        />
      </label>
      <label className="field">
        <span>Threshold value</span>
        <input
          className="input"
          type="number"
          value={draftRule.threshold}
          onChange={(event) => onChange({ ...draftRule, threshold: event.target.value })}
        />
      </label>
      <label className="field">
        <span>Action value</span>
        <input
          className="input"
          type="text"
          value={draftRule.actionValue}
          onChange={(event) => onChange({ ...draftRule, actionValue: event.target.value })}
          placeholder="0 or true/false depending on action"
        />
      </label>
      <div className="button-row">
        <button className="btn btn-primary" type="button" onClick={onSave} disabled={loading}>
          Save rule
        </button>
        <button className="btn btn-ghost" type="button" onClick={onLoadDefault} disabled={loading}>
          Load Suggested Ruleset
        </button>
      </div>
    </div>
  );
}
