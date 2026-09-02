import { Reveal, Button, Input, Label } from '@atoms';
import { isApiError } from '@/services/axios';
import {
  createApprovalRule,
  listApprovalActions,
  listApprovalRules,
  type ApprovalAction,
  type ApprovalRule,
} from '@/services/approvals';
import { AlertCircle, CheckCircle2, WifiOff } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useId, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';

type PageStatus = 'loading' | 'empty' | 'denied' | 'failure' | 'success' | null;

function statusCopy(status: PageStatus): { icon: typeof AlertCircle; text: string } | null {
  switch (status) {
    case 'loading':
      return { icon: AlertCircle, text: 'Loading sign-off rules' };
    case 'empty':
      return {
        icon: AlertCircle,
        text: 'No sign-off rules yet. Add one when a till action needs another person to approve.',
      };
    case 'denied':
      return {
        icon: AlertCircle,
        text: 'You need Approvals access to change sign-off rules.',
      };
    case 'failure':
      return { icon: WifiOff, text: 'Could not load sign-off rules. Try again.' };
    case 'success':
      return { icon: CheckCircle2, text: 'Sign-off rule saved for this pharmacy.' };
    default:
      return null;
  }
}

function hasApprovals(modules: string[] | undefined): boolean {
  return modules?.includes('APPROVALS') === true;
}

export default function SignOffRulesScreen() {
  const modules = useSelector((s: RootState) => s.auth.user?.modules);
  const role = useSelector((s: RootState) => s.auth.user?.role);
  const allowed = role === 'pharmacy_owner' || hasApprovals(modules);
  const statusId = useId();
  const [rules, setRules] = useState<ApprovalRule[]>([]);
  const [actions, setActions] = useState<ApprovalAction[]>([]);
  const [status, setStatus] = useState<PageStatus>(allowed ? 'loading' : 'denied');
  const [banner, setBanner] = useState<string | null>(null);
  const [actionKey, setActionKey] = useState('SALES_DISCOUNT_PERCENT');
  const [threshold, setThreshold] = useState('1000');
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!allowed) {
      setStatus('denied');
      return;
    }
    setStatus('loading');
    try {
      const [nextRules, nextActions] = await Promise.all([
        listApprovalRules(),
        listApprovalActions(),
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
  }, [allowed]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedAction = actions.find((row) => row.actionKey === actionKey) ?? actions[0];

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setBanner(null);
    if (!selectedAction) {
      setFormError('Pick an action that needs sign-off.');
      return;
    }
    const value = Number(threshold);
    if (!Number.isFinite(value) || value < 0) {
      setFormError('Enter a threshold of zero or more.');
      return;
    }
    try {
      await createApprovalRule({
        moduleCode: selectedAction.moduleCode,
        actionKey: selectedAction.actionKey,
        thresholdValue: value,
        approverType: 'ACCOUNT_CLASS',
        approverAccountClass: 'pharmacy_owner',
        allowSelfApproval: false,
      });
      setBanner('Sign-off rule saved for this pharmacy.');
      setStatus('success');
      await load();
    } catch (err) {
      if (isApiError(err) && err.code === 'FORBIDDEN') {
        setFormError('You need Approvals access to change sign-off rules.');
        return;
      }
      if (isApiError(err) && err.code === 'DUPLICATE_RULE') {
        setFormError('A rule already exists for this action.');
        return;
      }
      setFormError('Could not save this rule. Try again.');
    }
  }

  const copy = banner ? { icon: CheckCircle2, text: banner } : statusCopy(status);

  return (
    <Reveal className="flex flex-col gap-4 p-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-ink">Sign-off rules</h1>
        <p className="text-sm text-muted">
          Decide when a till action waits for another role before it completes.
        </p>
      </header>

      {copy ? (
        <p
          id={statusId}
          role="status"
          className="flex items-center gap-2 rounded border border-line bg-surface px-3 py-2 text-sm text-ink"
        >
          <copy.icon className="size-4 shrink-0" aria-hidden />
          {copy.text}
        </p>
      ) : null}

      {allowed && status !== 'denied' && status !== 'failure' ? (
        <form
          onSubmit={onSubmit}
          className="flex max-w-xl flex-col gap-3 rounded border border-line bg-surface p-3"
          aria-describedby={formError ? `${statusId}-form` : undefined}
        >
          <div className="flex flex-col gap-1">
            <Label htmlFor="signoff-action">Action</Label>
            <select
              id="signoff-action"
              className="h-9 rounded border border-line bg-canvas px-2 text-sm text-ink"
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
          <div className="flex flex-col gap-1">
            <Label htmlFor="signoff-threshold">
              Threshold ({selectedAction?.unit === 'BPS' ? 'basis points' : 'paise'})
            </Label>
            <Input
              id="signoff-threshold"
              inputMode="numeric"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
            />
          </div>
          <p className="text-xs text-muted">Approver: pharmacy owner (cannot self-approve).</p>
          {formError ? (
            <p id={`${statusId}-form`} role="alert" className="text-sm text-danger">
              {formError}
            </p>
          ) : null}
          <Button type="submit">Save sign-off rule</Button>
        </form>
      ) : null}

      {rules.length > 0 ? (
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">Configured sign-off rules</caption>
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
              <tr key={rule.id} className="border-b border-line/70 text-ink">
                <td className="py-2 pr-3">{rule.moduleCode}</td>
                <td className="py-2 pr-3">{rule.actionKey}</td>
                <td className="py-2 pr-3 tabular-nums">{rule.thresholdValue ?? '—'}</td>
                <td className="py-2">{rule.approverAccountClass ?? rule.approverRoleId ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </Reveal>
  );
}
