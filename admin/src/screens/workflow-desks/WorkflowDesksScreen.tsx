import { Reveal, Button, Input, Label } from '@atoms';
import { isApiError } from '@/services/axios';
import {
  createWorkflowRule,
  listWorkflowActions,
  listWorkflowRules,
  type WorkflowAction,
  type WorkflowRule,
} from '@/services/workflows';
import { Ban, ShieldAlert, ShieldCheck, Unplug } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useId, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';

type PageStatus = 'loading' | 'empty' | 'denied' | 'failure' | 'success' | null;

function statusCopy(status: PageStatus): { icon: typeof Ban; text: string } | null {
  switch (status) {
    case 'loading':
      return { icon: ShieldAlert, text: 'Loading workflow desks' };
    case 'empty':
      return {
        icon: ShieldAlert,
        text: 'No platform workflow rules yet. Define thresholds for HQ-gated actions.',
      };
    case 'denied':
      return { icon: Ban, text: 'Only the HQ administrator can manage workflow desks.' };
    case 'failure':
      return { icon: Unplug, text: 'Could not load workflow desks. Retry.' };
    case 'success':
      return { icon: ShieldCheck, text: 'Workflow rule stored for the platform.' };
    default:
      return null;
  }
}

export default function WorkflowDesksScreen() {
  const role = useSelector((s: RootState) => s.auth.user?.role);
  const master = role === 'admin_super';
  const statusId = useId();
  const [rules, setRules] = useState<WorkflowRule[]>([]);
  const [actions, setActions] = useState<WorkflowAction[]>([]);
  const [status, setStatus] = useState<PageStatus>(master ? 'loading' : 'denied');
  const [banner, setBanner] = useState<string | null>(null);
  const [actionKey, setActionKey] = useState('SALES_DISCOUNT_PERCENT');
  const [threshold, setThreshold] = useState('1000');
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!master) {
      setStatus('denied');
      return;
    }
    setStatus('loading');
    try {
      const [nextRules, nextActions] = await Promise.all([
        listWorkflowRules(),
        listWorkflowActions(),
      ]);
      setRules(nextRules);
      setActions(nextActions);
      if (nextActions[0]) {
        setActionKey(nextActions[0].actionKey);
      }
      setStatus(nextRules.length === 0 ? 'empty' : null);
    } catch (err) {
      if (isApiError(err) && err.code === 'FORBIDDEN') {
        setStatus('denied');
        return;
      }
      setStatus('failure');
    }
  }, [master]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedAction = actions.find((row) => row.actionKey === actionKey) ?? actions[0];

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setBanner(null);
    if (!selectedAction) {
      setFormError('Select a workflow action.');
      return;
    }
    const value = Number(threshold);
    if (!Number.isFinite(value) || value < 0) {
      setFormError('Threshold must be zero or greater.');
      return;
    }
    try {
      await createWorkflowRule({
        moduleCode: selectedAction.moduleCode,
        actionKey: selectedAction.actionKey,
        thresholdValue: value,
        approverType: 'ACCOUNT_CLASS',
        approverAccountClass: 'admin_super',
        allowSelfApproval: false,
      });
      setBanner('Workflow rule stored for the platform.');
      setStatus('success');
      await load();
    } catch (err) {
      if (isApiError(err) && err.code === 'FORBIDDEN') {
        setFormError('Only the HQ administrator can manage workflow desks.');
        return;
      }
      if (isApiError(err) && err.code === 'DUPLICATE_RULE') {
        setFormError('A workflow rule already exists for this action.');
        return;
      }
      setFormError('Could not store this workflow rule.');
    }
  }

  const copy = banner ? { icon: ShieldCheck, text: banner } : statusCopy(status);

  return (
    <Reveal className="flex flex-col gap-4 p-4">
      <header className="border-b border-line pb-3">
        <h1 className="font-serif text-2xl text-ink">Workflow desks</h1>
        <p className="mt-1 text-sm text-muted">
          Configure platform approval thresholds and who may sign them off.
        </p>
      </header>

      {copy ? (
        <p
          id={statusId}
          role="status"
          className="flex items-center gap-2 border border-line bg-elevated px-3 py-2 text-sm text-ink"
        >
          <copy.icon className="size-4 shrink-0" aria-hidden />
          {copy.text}
        </p>
      ) : null}

      {master && status !== 'denied' && status !== 'failure' ? (
        <form onSubmit={onSubmit} className="grid max-w-xl gap-3 border border-line bg-surface p-3">
          <div className="grid gap-1">
            <Label htmlFor="workflow-action">Action</Label>
            <select
              id="workflow-action"
              className="h-9 border border-line bg-canvas px-2 text-sm text-ink"
              value={actionKey}
              onChange={(e) => setActionKey(e.target.value)}
            >
              {actions.map((action) => (
                <option key={action.actionKey} value={action.actionKey}>
                  {action.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="workflow-threshold">
              Threshold ({selectedAction?.unit === 'BPS' ? 'bps' : 'paise'})
            </Label>
            <Input
              id="workflow-threshold"
              inputMode="numeric"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
            />
          </div>
          <p className="text-xs text-muted">Approver desk: MASTER (self-approval blocked).</p>
          {formError ? (
            <p role="alert" className="text-sm text-danger">
              {formError}
            </p>
          ) : null}
          <Button type="submit">Store workflow rule</Button>
        </form>
      ) : null}

      {rules.length > 0 ? (
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">Platform workflow rules</caption>
          <thead>
            <tr className="border-b border-line text-muted">
              <th className="py-2 pr-3 font-medium">Module</th>
              <th className="py-2 pr-3 font-medium">Action</th>
              <th className="py-2 pr-3 font-medium">Threshold</th>
              <th className="py-2 font-medium">Approver</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr key={rule.id} className="border-b border-line text-ink">
                <td className="py-2 pr-3 font-mono text-xs">{rule.moduleCode}</td>
                <td className="py-2 pr-3 font-mono text-xs">{rule.actionKey}</td>
                <td className="py-2 pr-3 tabular-nums">{rule.thresholdValue ?? '—'}</td>
                <td className="py-2 font-mono text-xs">
                  {rule.approverAccountClass ?? rule.approverRoleId ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </Reveal>
  );
}
