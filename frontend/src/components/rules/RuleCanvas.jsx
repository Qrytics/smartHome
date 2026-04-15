import React from 'react';

const SLOT_ORDER = ['trigger', 'condition', 'action'];

function slotTitle(slot) {
  if (slot === 'trigger') return 'Trigger';
  if (slot === 'condition') return 'Condition';
  return 'Action';
}

export default function RuleCanvas({ draftRule, onDropBlock, onClearSlot }) {
  function handleDrop(event, slot) {
    event.preventDefault();
    const raw = event.dataTransfer.getData('application/x-rule-block');
    if (!raw) return;
    try {
      const block = JSON.parse(raw);
      onDropBlock(slot, block);
    } catch (error) {
      // Ignore malformed drag payloads.
    }
  }

  return (
    <div className="rule-canvas">
      {SLOT_ORDER.map((slot) => {
        const block = draftRule[slot];
        return (
          <div
            key={slot}
            className="rule-slot"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => handleDrop(event, slot)}
          >
            <div className="rule-slot-header">
              <strong>{slotTitle(slot)}</strong>
              {block ? (
                <button className="btn btn-ghost btn-small" type="button" onClick={() => onClearSlot(slot)}>
                  Clear
                </button>
              ) : null}
            </div>
            {block ? (
              <div className="rule-slot-filled">
                <span className="rule-block-type">{block.type}</span>
                <span>{block.label}</span>
              </div>
            ) : (
              <div className="empty-state">Drag a {slot} block here</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
