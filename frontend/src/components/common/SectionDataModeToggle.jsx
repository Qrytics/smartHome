import React from 'react';

export default function SectionDataModeToggle({ value, onChange }) {
  return (
    <div className="button-row">
      {[
        { id: 'auto', label: 'Auto' },
        { id: 'real', label: 'Real' },
        { id: 'demo', label: 'Demo' },
      ].map((mode) => (
        <button
          key={mode.id}
          type="button"
          className={`btn btn-small ${value === mode.id ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => onChange(mode.id)}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}
