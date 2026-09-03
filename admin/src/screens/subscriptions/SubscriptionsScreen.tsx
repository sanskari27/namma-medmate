import { Button, Input, Label, Reveal } from '@atoms';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@molecules';
import {
  isApiError,
  listOverrideHistory,
  listSubscriptions,
  overrideSubscription,
  type AdminSubscription,
  type OverrideEvent,
} from '@/services/subscriptions';
import type { RootState } from '@/store';
import { Ban, BadgeCheck, ScrollText, Unplug } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';

type PageStatus = 'loading' | 'empty' | 'denied' | 'failure' | 'success' | null;
type DialogStatus = 'empty' | 'validation' | 'denied' | 'conflict' | 'failure' | 'loading' | null;

function isMaster(role: string | undefined): boolean {
  return role === 'admin_super';
}

function planLabel(code: string): string {
  return code.charAt(0) + code.slice(1).toLowerCase();
}

function formatIstDate(value: string | null): string {
  if (!value) {
    return 'Open-ended';
  }
  try {
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeZone: 'Asia/Kolkata',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatIstStamp(value: string): string {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Kolkata',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function occupancy(used: number, cap: number | null): { label: string; ratio: number } {
  if (cap == null) {
    return { label: `${used} / open`, ratio: 0 };
  }
  return { label: `${used}/${cap}`, ratio: cap === 0 ? 0 : Math.min(1, used / cap) };
}

function statusCopy(status: PageStatus): { icon: typeof Ban; text: string } | null {
  switch (status) {
    case 'loading':
      return { icon: ScrollText, text: 'Loading tenant subscriptions…' };
    case 'empty':
      return { icon: ScrollText, text: 'No tenant subscriptions on the platform yet.' };
    case 'denied':
      return { icon: Ban, text: 'Only MASTER can override tenant plans, status, or expiry.' };
    case 'failure':
      return { icon: Unplug, text: 'Could not load tenant subscriptions. Try again.' };
    case 'success':
      return {
        icon: BadgeCheck,
        text: 'Override filed. Plan, status, and expiry updated for the tenant.',
      };
    default:
      return null;
  }
}

function dialogCopy(status: DialogStatus): string | null {
  switch (status) {
    case 'empty':
      return 'No override history for this tenant yet.';
    case 'validation':
      return 'Plan, status, and a reason are required before filing an override.';
    case 'denied':
      return 'Your desk cannot file plan overrides.';
    case 'conflict':
      return 'Usage exceeds the target plan. Tenant must reduce outlets or users first.';
    case 'failure':
      return 'Could not file the override. Try again.';
    default:
      return null;
  }
}

function UsageTrack({ label, used, cap }: { label: string; used: number; cap: number | null }) {
  const { label: fraction, ratio } = occupancy(used, cap);
  return (
    <div>
      <p className="font-mono text-[11px] text-muted">
        {label} {fraction}
      </p>
      <div className="mt-1 h-1 w-24 bg-elevated" aria-hidden="true">
        <div className="h-1 bg-brand" style={{ width: `${Math.round(ratio * 100)}%` }} />
      </div>
    </div>
  );
}

export default function SubscriptionsScreen() {
  const role = useSelector((s: RootState) => s.auth.user?.role);
  const allowed = isMaster(role);
  const statusId = useId();
  const reasonId = useId();
  const findId = useId();
  const restoreRef = useRef<HTMLElement | null>(null);
  const [status, setStatus] = useState<PageStatus>(allowed ? 'loading' : 'denied');
  const [items, setItems] = useState<AdminSubscription[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<AdminSubscription | null>(null);
  const [history, setHistory] = useState<OverrideEvent[]>([]);
  const [historyStatus, setHistoryStatus] = useState<DialogStatus>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogStatus, setDialogStatus] = useState<DialogStatus>(null);
  const [planCode, setPlanCode] = useState('FREE');
  const [subStatus, setSubStatus] = useState('ACTIVE');
  const [expiresAt, setExpiresAt] = useState('');
  const [branchCap, setBranchCap] = useState('');
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    if (!allowed) {
      setStatus('denied');
      return;
    }
    setStatus('loading');
    try {
      const list = await listSubscriptions();
      setItems(list);
      setStatus(list.length === 0 ? 'empty' : null);
    } catch {
      setStatus('failure');
    }
  }, [allowed]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return items;
    }
    return items.filter(
      (row) =>
        row.tenantName.toLowerCase().includes(needle) ||
        row.planCode.toLowerCase().includes(needle),
    );
  }, [items, query]);

  const mix = useMemo(() => {
    const counts: Record<string, number> = { FREE: 0, STARTER: 0, GROWTH: 0, PRO: 0 };
    for (const row of items) {
      counts[row.planCode] = (counts[row.planCode] ?? 0) + 1;
    }
    return counts;
  }, [items]);

  async function openFile(row: AdminSubscription, trigger: HTMLElement) {
    restoreRef.current = trigger;
    setSelected(row);
    setPlanCode(row.planCode);
    setSubStatus(row.status);
    setExpiresAt(row.expiresAt ? row.expiresAt.slice(0, 10) : '');
    setBranchCap(row.branchLimitOverride != null ? String(row.branchLimitOverride) : '');
    setReason('');
    setDialogStatus(null);
    setDialogOpen(true);
    setHistoryStatus('loading');
    try {
      const events = await listOverrideHistory(row.tenantId);
      setHistory(events);
      setHistoryStatus(events.length === 0 ? 'empty' : null);
    } catch (error) {
      if (isApiError(error) && error.status === 403) {
        setHistoryStatus('denied');
        return;
      }
      setHistoryStatus('failure');
    }
  }

  function closeDialog() {
    setDialogOpen(false);
    restoreRef.current?.focus();
  }

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
      setItems(list);
      setDialogOpen(false);
      restoreRef.current?.focus();
      setStatus('success');
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

  const banner = statusCopy(status);

  return (
    <Reveal className="space-y-5">
      <div className="border-b border-line pb-4">
        <h1 className="font-serif text-xl text-ink">Plan overrides</h1>
        <p className="mt-1 text-sm text-muted">
          Scan the platform ledger: tenant plan, stall occupancy, expiry, and any branch-cap
          exception. File a MASTER override with a reason; the docket stays append-only.
        </p>
      </div>

      {banner ? (
        <p
          id={statusId}
          role="alert"
          className="flex items-start gap-2 border border-line bg-elevated px-3 py-2 text-sm text-ink"
        >
          <banner.icon className="mt-0.5 size-3.5 shrink-0 text-brand" aria-hidden="true" />
          <span>{banner.text}</span>
        </p>
      ) : null}

      {allowed && items.length > 0 ? (
        <>
          <section
            aria-labelledby="mix-heading"
            className="grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4"
          >
            <h2 id="mix-heading" className="sr-only">
              Tenants by plan
            </h2>
            {(['FREE', 'STARTER', 'GROWTH', 'PRO'] as const).map((code) => (
              <div key={code} className="bg-surface px-3 py-2">
                <p className="font-mono text-[11px] text-brand">{code}</p>
                <p className="font-serif text-lg text-ink">{mix[code] ?? 0}</p>
                <p className="text-xs text-muted">{planLabel(code)} tenants</p>
              </div>
            ))}
          </section>

          <div className="max-w-sm space-y-1.5">
            <Label htmlFor={findId}>Find tenant</Label>
            <Input
              id={findId}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              autoComplete="off"
            />
          </div>

          <div className="overflow-x-auto border border-line">
            <table className="w-full min-w-[52rem] border-collapse text-left text-sm">
              <caption className="sr-only">Tenant subscriptions</caption>
              <thead className="border-b border-line bg-elevated text-[11px] text-muted">
                <tr>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Tenant
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Plan
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Status
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Occupancy
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Expiry (IST)
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    File
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr key={row.tenantId} className="border-b border-line last:border-b-0">
                    <td className="px-3 py-3 text-ink">
                      <p>{row.tenantName}</p>
                      {row.branchLimitOverride != null ? (
                        <p className="font-mono text-[11px] text-warn">
                          Branch cap override {row.branchLimitOverride}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 font-mono text-[11px] text-brand">{row.planCode}</td>
                    <td className="px-3 py-3 font-mono text-[11px] text-muted">{row.status}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-2">
                        <UsageTrack
                          label="Outlets"
                          used={row.branchesUsed}
                          cap={row.effectiveBranchLimit}
                        />
                        <UsageTrack label="Users" used={row.usersUsed} cap={row.maxUsers} />
                      </div>
                    </td>
                    <td className="px-3 py-3 font-mono text-[11px] text-muted">
                      {formatIstDate(row.expiresAt)}
                    </td>
                    <td className="px-3 py-3">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={(event) => void openFile(row, event.currentTarget)}
                      >
                        Override file
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {visible.length === 0 ? (
            <p className="text-sm text-muted">No tenant on this ledger matches that search.</p>
          ) : null}
        </>
      ) : null}

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
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
                  {selected.branchesUsed}/{selected.effectiveBranchLimit} outlets,{' '}
                  {selected.usersUsed}/{selected.maxUsers ?? 'open'} users
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
              <Button type="button" variant="outline" onClick={closeDialog}>
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
    </Reveal>
  );
}
