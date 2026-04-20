import React from 'react';

export default function RuleInspector({ onSave, loading }) {
  return (
    <div className="rule-inspector">
      <div className="button-row">
        <button className="btn btn-primary" type="button" onClick={onSave} disabled={loading}>
          Save rule
        </button>
      </div>
    </div>
  );
}
