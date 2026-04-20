import React from 'react';

const PALETTE_GROUPS = [
  {
    title: 'Triggers',
    subtitle: 'When this happens',
    blocks: [
      { type: 'trigger', key: 'temperature', label: 'Temperature' },
      { type: 'trigger', key: 'light_lux', label: 'Light Lux' },
      { type: 'trigger', key: 'rfid_denied', label: 'RFID Denied Event' },
    ],
  },
  {
    title: 'Conditions',
    subtitle: 'Compare threshold',
    blocks: [
      { type: 'condition', key: 'gt', label: '>' },
      { type: 'condition', key: 'lt', label: '<' },
      { type: 'condition', key: 'eq', label: '=' },
    ],
  },
  {
    title: 'Actions',
    subtitle: 'Then do this',
    blocks: [
      { type: 'action', key: 'set_dimmer', label: 'Set Dimmer %' },
      { type: 'action', key: 'set_fan', label: 'Set Fan On/Off' },
      { type: 'action', key: 'set_door_lock', label: 'Door Lock/Unlock' },
    ],
  },
];

export default function RulePalette() {
  function onDragStart(event, block) {
    event.dataTransfer.setData('application/x-rule-block', JSON.stringify(block));
    event.dataTransfer.effectAllowed = 'copy';
  }

  return (
    <div className="rule-palette">
      <h4 className="panel-title">Block Palette</h4>
      <div className="rule-palette-groups">
        {PALETTE_GROUPS.map((group) => (
          <section key={group.title} className="rule-palette-section" aria-labelledby={`palette-${group.title}`}>
            <header className="rule-palette-section-head">
              <h5 className="rule-palette-section-title" id={`palette-${group.title}`}>
                {group.title}
              </h5>
              <span className="rule-palette-section-sub">{group.subtitle}</span>
            </header>
            <div className="rule-palette-grid">
              {group.blocks.map((block) => (
                <button
                  key={`${block.type}-${block.key}`}
                  type="button"
                  className="rule-block"
                  draggable
                  onDragStart={(event) => onDragStart(event, block)}
                >
                  <span>{block.label}</span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
