import React from 'react';

const BLOCKS = [
  { type: 'trigger', key: 'temperature', label: 'Temperature' },
  { type: 'trigger', key: 'light_lux', label: 'Light Lux' },
  { type: 'trigger', key: 'rfid_denied', label: 'RFID Denied Event' },
  { type: 'condition', key: 'gt', label: '>' },
  { type: 'condition', key: 'lt', label: '<' },
  { type: 'condition', key: 'eq', label: '=' },
  { type: 'action', key: 'set_dimmer', label: 'Set Dimmer %' },
  { type: 'action', key: 'set_fan', label: 'Set Fan On/Off' },
  { type: 'action', key: 'set_door_lock', label: 'Door Lock/Unlock' },
];

export default function RulePalette() {
  function onDragStart(event, block) {
    event.dataTransfer.setData('application/x-rule-block', JSON.stringify(block));
    event.dataTransfer.effectAllowed = 'copy';
  }

  return (
    <div className="rule-palette">
      <h4 className="panel-title">Block Palette</h4>
      <div className="rule-palette-grid">
        {BLOCKS.map((block) => (
          <button
            key={`${block.type}-${block.key}`}
            type="button"
            className="rule-block"
            draggable
            onDragStart={(event) => onDragStart(event, block)}
          >
            <span className="rule-block-type">{block.type}</span>
            <span>{block.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
