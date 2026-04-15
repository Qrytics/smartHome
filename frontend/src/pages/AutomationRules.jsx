import React, { useMemo, useState } from 'react';
import Panel from '../components/common/Panel';
import StatusBadge from '../components/common/StatusBadge';
import RulePalette from '../components/rules/RulePalette';
import RuleCanvas from '../components/rules/RuleCanvas';
import RuleInspector from '../components/rules/RuleInspector';
import { useSmartHome } from '../contexts/SmartHomeContext';

const EMPTY_RULE = {
  name: '',
  trigger: null,
  condition: null,
  action: null,
  threshold: 0,
  actionValue: '',
};

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
    setDraftRule((previous) => ({ ...previous, [slot]: block }));
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
          <div className="split-grid">
            <RulePalette />
            <RuleCanvas
              draftRule={draftRule}
              onDropBlock={handleDropBlock}
              onClearSlot={(slot) => setDraftRule((previous) => ({ ...previous, [slot]: null }))}
            />
          </div>
          <RuleInspector
            draftRule={draftRule}
            onChange={setDraftRule}
            onSave={handleSaveRule}
            onLoadDefault={handleLoadDefault}
            loading={loading.rules}
          />
          {notice ? <p className="form-notice">{notice}</p> : null}
          {!canSave ? <p className="form-error">Complete trigger, condition, and action blocks before saving.</p> : null}
        </Panel>

        <Panel title="Saved Rules" subtitle="Enable, disable, or delete rules">
          <div className="table-wrap">
            <table className="data-table">
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
                        <StatusBadge tone={rule.enabled ? 'success' : 'neutral'}>
                          {rule.enabled ? 'ENABLED' : 'DISABLED'}
                        </StatusBadge>
                      </td>
                      <td className="align-right">
                        <div className="button-row">
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
