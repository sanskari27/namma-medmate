import { Button, Input, Label } from '@atoms';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@molecules';
import {
  isApiError,
  listOverrideHistory,
  listSubscriptions,
  overrideSubscription,
  type AdminSubscription,
  type OverrideEvent,
} from '@/services/subscriptions';
import { FormEvent, useEffect, useId, useState } from 'react';
import { dialogCopy, formatIstDate, formatIstStamp, planLabel, type DialogStatus } from '../../SubscriptionsScreen.utils';

export function OverrideFileDialog({
  open,
  selected,
  onClose,
  onFiled,
}: {
  open: boolean;
  selected: AdminSubscription | null;
  onClose: () => void;
  onFiled: (items: AdminSubscription[]) => void;
}) {
  const reasonId = useId();
  const [history, setHistory] = useState<OverrideEvent[]>([]);
  const [historyStatus, setHistoryStatus] = useState<DialogStatus>(null);
  const [dialogStatus, setDialogStatus] = useState<DialogStatus>(null);
  const [planCode, setPlanCode] = useState('FREE');
  const [subStatus, setSubStatus] = useState('ACTIVE');
  const [expiresAt, setExpiresAt] = useState('');
  const [branchCap, setBranchCap] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!open || !selected) {
      return;
    }
    setPlanCode(selected.planCode);
    setSubStatus(selected.status);
    setExpiresAt(selected.expiresAt ? selected.expiresAt.slice(0, 10) : '');
    setBranchCap(selected.branchLimitOverride != null ? String(selected.branchLimitOverride) : '');
    setReason('');
    setDialogStatus(null);
    setHistory([]);
    setHistoryStatus('loading');
    void listOverrideHistory(selected.tenantId)
      .then((events) => {
        setHistory(events);
        setHistoryStatus(events.length === 0 ? 'empty' : null);
      })
      .catch((error: unknown) => {
        if (isApiError(error) && error.status === 403) {
          setHistoryStatus('denied');
          return;
        }
        setHistoryStatus('failure');
      });
  }, [open, selected]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!selected) {
      return;
    }
    if (!planCode || !subStatus || !reason.trim()) {
      setDialogStatus('validation');
      return;
    }
    setDialogStatus('loading');
    try {
      const override = branchCap.trim() === '' ? null : Number(branchCap);
      if (branchCap.trim() !== '' && (!Number.isInteger(override) || override! < 1)) {
        setDialogStatus('validation');
        return;
      }
      await overrideSubscription(selected.tenantId, {
        planCode,
        status: subStatus,
        expiresAt: expiresAt ? `${expiresAt}T00:00:00Z` : null,
        branchLimitOverride: override,
        reason: reason.trim(),
      });
      const list = await listSubscriptions();
      onFiled(list);
    } catch (error) {
      if (isApiError(error)) {
        if (error.status === 403) {
          setDialogStatus('denied');
          return;
        }
        if (error.status === 409) {
          setDialogStatus('conflict');
          return;
        }
        if (error.status === 400 || error.status === 422) {
          setDialogStatus('validation');
          return;
        }
      }
      setDialogStatus('failure');
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent aria-describedby={undefined} className="max-w-lg">
        <DialogTitle>Override {selected?.tenantName ?? 'tenant'}</DialogTitle>
        <DialogDescription>
          MASTER may set plan, status, expiry, and a branch-cap override. History is append-only.
        </DialogDescription>
        {selected ? (
          <dl className="mt-3 grid grid-cols-2 gap-2 border border-line bg-elevated px-3 py-2 font-mono text-[11px] text-muted">
            <div>
              <dt>Current occupancy</dt>
              <dd className="text-ink">
                {selected.branchesUsed}/{selected.effectiveBranchLimit} outlets, {selected.usersUsed}/
                {selected.maxUsers ?? 'open'} users
              </dd>
            </div>
            <div>
              <dt>Expiry on file</dt>
              <dd className="text-ink">{formatIstDate(selected.expiresAt)}</dd>
            </div>
          </dl>
        ) : null}
        {dialogCopy(dialogStatus) ? (
          <p role="alert" className="mt-3 text-sm text-ink">
            {dialogCopy(dialogStatus)}
          </p>
        ) : null}
        <form onSubmit={onSubmit} className="mt-4 space-y-3" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="plan-code">Plan</Label>
            <select
              id="plan-code"
              className="w-full border border-line bg-canvas px-3 py-2 text-sm text-ink"
              value={planCode}
              onChange={(event) => setPlanCode(event.target.value)}
            >
              <option value="FREE">{planLabel('FREE')}</option>
              <option value="STARTER">{planLabel('STARTER')}</option>
              <option value="GROWTH">{planLabel('GROWTH')}</option>
              <option value="PRO">{planLabel('PRO')}</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sub-status">Status</Label>
            <select
              id="sub-status"
              className="w-full border border-line bg-canvas px-3 py-2 text-sm text-ink"
              value={subStatus}
              onChange={(event) => setSubStatus(event.target.value)}
            >
              <option value="ACTIVE">Active</option>
              <option value="EXPIRED">Expired</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="expires-at">Expiry (UTC date, optional)</Label>
            <Input
              id="expires-at"
              type="date"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="branch-cap">Branch cap override</Label>
            <Input
              id="branch-cap"
              inputMode="numeric"
              value={branchCap}
              onChange={(event) => setBranchCap(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={reasonId}>Override reason</Label>
            <textarea
              id={reasonId}
              className="min-h-20 w-full border border-line bg-canvas px-3 py-2 text-sm text-ink"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={dialogStatus === 'loading'}>
              {dialogStatus === 'loading' ? 'Filing…' : 'File override'}
            </Button>
          </div>
        </form>
        <section className="mt-5 border-t border-line pt-4" aria-labelledby="history-heading">
          <h2 id="history-heading" className="font-serif text-base text-ink">
            Override history
          </h2>
          {historyStatus === 'empty' ? (
            <p className="mt-2 text-sm text-muted">No override history for this tenant yet.</p>
          ) : null}
          {history.length > 0 ? (
            <ol className="mt-2 space-y-2 font-mono text-[11px] text-muted">
              {history.map((event) => (
                <li key={event.id}>
                  <p>
                    {event.beforePlan} → {event.afterPlan} · {event.reason}
                  </p>
                  <p>{formatIstStamp(event.createdAt)}</p>
                </li>
              ))}
            </ol>
          ) : null}
        </section>
      </DialogContent>
    </Dialog>
  );
}
