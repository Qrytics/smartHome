import React, { useMemo, useState } from 'react';
import Panel from '../components/common/Panel';
import StatusBadge from '../components/common/StatusBadge';
import RulePalette from '../components/rules/RulePalette';
import RuleCanvas from '../components/rules/RuleCanvas';
import { useSmartHome } from '../contexts/SmartHomeContext';

const EMPTY_RULE = {
  name: '',
  trigger: null,
  condition: null,
  action: null,
  threshold: 0,
  actionValue: '',
};

function defaultActionValueForKey(actionKey) {
  if (actionKey === 'set_dimmer') return '50';
  if (actionKey === 'set_fan') return 'false';
  if (actionKey === 'set_door_lock') return 'locked';
  return '';
}

export default function AutomationRules() {
  const {
    automationRules,
    loading,
    refreshAutomationRules,
    saveAutomationRule,
    removeAutomationRule,
    setAutomationRuleEnabled,
    loadDefaultRuleset,
    sectionStatus,
  } = useSmartHome();
  const [draftRule, setDraftRule] = useState(EMPTY_RULE);
  const [notice, setNotice] = useState('');
  const rulesStatus = sectionStatus.rules;

  const canSave = useMemo(
    () => Boolean(draftRule.name && draftRule.trigger && draftRule.condition && draftRule.action),
    [draftRule]
  );

  function handleDropBlock(slot, block) {
    if (!block || block.type !== slot) return;
    setDraftRule((previous) => {
      const next = { ...previous, [slot]: block };
      if (slot === 'action') {
        next.actionValue = defaultActionValueForKey(block.key);
      }
      return next;
    });
  }

  async function handleSaveRule() {
    if (!canSave) return;
    await saveAutomationRule({
      name: draftRule.name,
      enabled: true,
      trigger: draftRule.trigger.key,
      comparator: draftRule.condition.key,
      threshold: Number(draftRule.threshold),
      action: draftRule.action.key,
      action_value: draftRule.actionValue,
    });
    setNotice('Rule saved.');
    setDraftRule(EMPTY_RULE);
  }

  async function handleLoadDefault() {
    const rules = await loadDefaultRuleset();
    setNotice(`Loaded ${rules.length} suggested rules.`);
  }

  return (
    <div className="page-stack">
      <Panel
        title="Automation Rules"
        subtitle="Build trigger-condition-action rules for lighting, HVAC, RFID, and door control."
        actions={
          <button className="btn btn-ghost btn-small" type="button" onClick={refreshAutomationRules}>
            Refresh rules
          </button>
        }
      >
        <div className="status-row">
          <span>Rules engine status</span>
          <StatusBadge tone={rulesStatus?.state === 'error' ? 'danger' : rulesStatus?.state === 'fallback' ? 'warning' : 'success'}>
            {(rulesStatus?.message || 'Ready').toUpperCase()}
          </StatusBadge>
        </div>
      </Panel>

      <section className="split-grid">
        <Panel title="Rule Builder" subtitle="Drag blocks from left to right">
          <div className="rule-builder-stack">
            {!canSave ? (
              <p className="form-error rule-builder-hint">Complete trigger, condition, and action blocks before saving.</p>
            ) : null}
            <div className="rule-builder-name-row">
              <label className="field rule-builder-name-field">
                <span>Rule name</span>
                <input
                  className="input"
                  type="text"
                  value={draftRule.name}
                  onChange={(event) => setDraftRule((previous) => ({ ...previous, name: event.target.value }))}
                  placeholder="Auto dim when room is bright"
                />
              </label>
              <button
                className="btn btn-primary rule-builder-save"
                type="button"
                onClick={handleSaveRule}
                disabled={!canSave || loading.rules}
              >
                Save rule
              </button>
            </div>
            <div className="rule-builder-layout">
              <RulePalette />
              <RuleCanvas
                draftRule={draftRule}
                onDropBlock={handleDropBlock}
                onDraftChange={(patch) => setDraftRule((previous) => ({ ...previous, ...patch }))}
                onClearSlot={(slot) =>
                  setDraftRule((previous) => ({
                    ...previous,
                    [slot]: null,
                    ...(slot === 'action' ? { actionValue: '' } : {}),
                  }))
                }
              />
            </div>
          </div>
          {notice ? <p className="form-notice">{notice}</p> : null}
        </Panel>

        <Panel
          title="Saved Rules"
          subtitle="Enable, disable, or delete rules"
          actions={
            <button className="btn btn-ghost btn-small" type="button" onClick={handleLoadDefault} disabled={loading.rules}>
              Load Suggested Ruleset
            </button>
          }
        >
          <div className="table-wrap table-wrap--automation-rules">
            <table className="data-table automation-rules-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Rule</th>
                  <th>State</th>
                  <th className="align-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {automationRules.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      <div className="empty-state">No automation rules available.</div>
                    </td>
                  </tr>
                ) : (
                  automationRules.map((rule) => (
                    <tr key={rule.id}>
                      <td>{rule.name}</td>
                      <td>{`${rule.trigger} ${rule.comparator} ${rule.threshold} -> ${rule.action}`}</td>
                      <td>
                        <span className="rule-state-badge-slot">
                          <StatusBadge tone={rule.enabled ? 'success' : 'neutral'}>
                            {rule.enabled ? 'ENABLED' : 'DISABLED'}
                          </StatusBadge>
                        </span>
                      </td>
                      <td className="align-right">
                        <div className="button-row rule-actions-column">
                          <button
                            className="btn btn-small btn-ghost"
                            type="button"
                            onClick={() => setAutomationRuleEnabled(rule.id, !rule.enabled)}
                          >
                            {rule.enabled ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            className="btn btn-small btn-danger"
                            type="button"
                            onClick={() => removeAutomationRule(rule.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </section>
    </div>
  );
}
