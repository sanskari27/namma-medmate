import { Button, Label, Reveal } from '@atoms';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@molecules';
import { ApiError, isApiError } from '@/services/axios';
import { listTenants, updateTenantStatus, type AdminTenant } from '@/services/tenants';
import type { RootState } from '@/store';
import { Ban, BadgeCheck, Building2, Unplug } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useId, useRef, useState } from 'react';
import { useSelector } from 'react-redux';

type PageStatus = 'loading' | 'empty' | 'denied' | 'failure' | 'success' | null;
type DecisionStatus = 'empty' | 'validation' | 'loading' | 'denied' | 'conflict' | 'failure';

function isMaster(role: string | undefined): boolean {
  return role === 'admin_super';
}

function statusLabel(status: string): string {
  switch (status) {
    case 'VERIFICATION_REQUIRED':
      return 'Verification required';
    case 'ACTIVE':
      return 'Active';
    case 'SUSPENDED':
      return 'Suspended';
    case 'EXPIRED':
      return 'Expired';
    case 'TERMINATED':
      return 'Terminated';
    default:
      return status;
  }
}

function transitionLabel(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return 'Reactivate';
    case 'SUSPENDED':
      return 'Suspend';
    case 'EXPIRED':
      return 'Mark expired';
    case 'TERMINATED':
      return 'Terminate';
    default:
      return status;
  }
}

function statusCopy(status: PageStatus): { icon: typeof Ban; text: string } | null {
  switch (status) {
    case 'loading':
      return { icon: Building2, text: 'Loading pharmacy tenants…' };
    case 'empty':
      return { icon: Building2, text: 'No pharmacy tenants on the platform yet.' };
    case 'denied':
      return { icon: Ban, text: 'Only MASTER can change pharmacy lifecycle status.' };
    case 'failure':
      return { icon: Unplug, text: 'Could not load pharmacies. Try again.' };
    case 'success':
      return { icon: BadgeCheck, text: 'Lifecycle change filed. Access cascade applied.' };
    default:
      return null;
  }
}

export default function PharmaciesScreen() {
  const role = useSelector((s: RootState) => s.auth.user?.role);
  const allowed = isMaster(role);
  const statusId = useId();
  const reasonId = useId();
  const [items, setItems] = useState<AdminTenant[]>([]);
  const [status, setStatus] = useState<PageStatus>(allowed ? 'loading' : 'denied');
  const [selected, setSelected] = useState<AdminTenant | null>(null);
  const [targetStatus, setTargetStatus] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [decisionStatus, setDecisionStatus] = useState<DecisionStatus>('empty');
  const restoreRef = useRef<HTMLElement | null>(null);

  const load = useCallback(async () => {
    if (!allowed) {
      setStatus('denied');
      return;
    }
    setStatus('loading');
    try {
      const next = await listTenants();
      setItems(next);
      setStatus(next.length === 0 ? 'empty' : null);
    } catch (error) {
      if (isApiError(error) || error instanceof ApiError) {
        if (error.status === 403) {
          setStatus('denied');
          return;
        }
      }
      setStatus('failure');
    }
  }, [allowed]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (targetStatus) {
      restoreRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setReason('');
      setDecisionStatus('empty');
    } else {
      restoreRef.current?.focus();
    }
  }, [targetStatus]);

  const copy = statusCopy(status);
  const decisionMessage =
    decisionStatus === 'validation'
      ? 'Enter a reason before filing this lifecycle change.'
      : decisionStatus === 'denied'
        ? 'Your desk cannot change this pharmacy status.'
        : decisionStatus === 'conflict'
          ? 'This pharmacy status changed elsewhere. Reload and try again.'
          : decisionStatus === 'failure'
            ? 'Could not file this lifecycle change. Try again.'
            : null;

  const openTransition = (tenant: AdminTenant, next: string) => {
    setSelected(tenant);
    setTargetStatus(next);
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected || !targetStatus) {
      return;
    }
    if (!reason.trim()) {
      setDecisionStatus('validation');
      return;
    }
    setDecisionStatus('loading');
    try {
      const updated = await updateTenantStatus(
        selected.id,
        targetStatus,
        selected.status,
        reason.trim(),
      );
      setTargetStatus(null);
      setSelected(updated);
      setItems((current) => current.map((row) => (row.id === updated.id ? updated : row)));
      setStatus('success');
    } catch (error) {
      if (isApiError(error) || error instanceof ApiError) {
        if (error.status === 409) {
          setDecisionStatus('conflict');
          return;
        }
        if (error.status === 403) {
          setDecisionStatus('denied');
          return;
        }
      }
      setDecisionStatus('failure');
    }
  };

  return (
    <Reveal className="space-y-5">
      <div className="border-b border-line pb-4">
        <h1 className="font-serif text-xl text-ink">Pharmacies</h1>
        <p className="mt-1 text-sm text-muted">
          Scan tenant lifecycle status and apply MASTER suspend, expire, terminate, or reactivate
          moves with a reason.
        </p>
      </div>

      {copy && !targetStatus ? (
        <p
          id={statusId}
          role="alert"
          className="flex items-start gap-2 border border-line bg-elevated px-3 py-2 text-sm text-ink"
        >
          <copy.icon className="mt-0.5 size-3.5 shrink-0 text-brand" aria-hidden="true" />
          <span>{copy.text}</span>
        </p>
      ) : null}

      {allowed ? (
        <div className="overflow-x-auto border border-line">
          <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
            <caption className="sr-only">Pharmacy tenants and lifecycle actions</caption>
            <thead className="border-b border-line bg-elevated text-[11px] tracking-wide text-muted uppercase">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">
                  Pharmacy
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Slug
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Status
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-b border-line last:border-b-0">
                  <td className="px-3 py-3 text-ink">{row.name}</td>
                  <td className="px-3 py-3 font-mono text-[11px] text-muted">{row.slug}</td>
                  <td className="px-3 py-3">
                    <span className="font-mono text-[11px] text-brand">
                      {statusLabel(row.status)}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    {row.allowedTransitions.length === 0 ? (
                      <span className="text-muted">No transitions</span>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {row.allowedTransitions.map((next) => (
                          <Button
                            key={next}
                            type="button"
                            size="sm"
                            variant={next === 'TERMINATED' ? 'outline' : 'primary'}
                            onClick={() => openTransition(row, next)}
                          >
                            {transitionLabel(next)}
                          </Button>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <Dialog open={targetStatus !== null} onOpenChange={(open) => !open && setTargetStatus(null)}>
        <DialogContent aria-describedby={undefined}>
          <DialogTitle>
            {targetStatus ? `${transitionLabel(targetStatus)} pharmacy` : 'Change pharmacy status'}
          </DialogTitle>
          <DialogDescription>
            File a reason for {selected?.name ?? 'this pharmacy'}. Records stay intact; access
            cascade follows the new status.
          </DialogDescription>
          {decisionMessage ? (
            <p role="alert" className="mt-3 text-sm text-ink">
              {decisionMessage}
            </p>
          ) : null}
          <form onSubmit={onSubmit} className="mt-4 space-y-3" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor={reasonId}>Lifecycle reason</Label>
              <textarea
                id={reasonId}
                className="min-h-24 w-full border border-line bg-canvas px-3 py-2 text-sm text-ink"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setTargetStatus(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={decisionStatus === 'loading'}>
                {decisionStatus === 'loading' ? 'Filing…' : 'Confirm change'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Reveal>
  );
}
