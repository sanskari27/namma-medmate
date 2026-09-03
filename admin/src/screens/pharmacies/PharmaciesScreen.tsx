import { Button, Label, Reveal } from '@atoms';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@molecules';
import { ApiError, isApiError } from '@/services/axios';
import {
  listTenantBranches,
  listTenants,
  updateTenantStatus,
  type AdminBranch,
  type AdminTenant,
} from '@/services/tenants';
import type { RootState } from '@/store';
import { Ban, BadgeCheck, Building2, MapPin, Unplug } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useId, useRef, useState } from 'react';
import { useSelector } from 'react-redux';

type PageStatus = 'loading' | 'empty' | 'denied' | 'failure' | 'success' | null;
type DecisionStatus = 'empty' | 'validation' | 'loading' | 'denied' | 'conflict' | 'failure';
type BranchPanelStatus = 'loading' | 'empty' | 'denied' | 'failure' | 'success' | null;

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

function branchPanelCopy(status: BranchPanelStatus): string | null {
  switch (status) {
    case 'loading':
      return 'Loading tenant outlets…';
    case 'empty':
      return 'No outlets on file for this tenant yet.';
    case 'denied':
      return 'Your desk cannot read tenant outlets.';
    case 'failure':
      return 'Could not load tenant outlets. Try again.';
    case 'success':
      return 'Tenant outlet file loaded for support review.';
    default:
      return null;
  }
}

export default function PharmaciesScreen() {
  const role = useSelector((s: RootState) => s.auth.user?.role);
  const allowed = isMaster(role);
  const statusId = useId();
  const reasonId = useId();
  const branchStatusId = useId();
  const [items, setItems] = useState<AdminTenant[]>([]);
  const [status, setStatus] = useState<PageStatus>(allowed ? 'loading' : 'denied');
  const [selected, setSelected] = useState<AdminTenant | null>(null);
  const [targetStatus, setTargetStatus] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [decisionStatus, setDecisionStatus] = useState<DecisionStatus>('empty');
  const [branchTenant, setBranchTenant] = useState<AdminTenant | null>(null);
  const [branches, setBranches] = useState<AdminBranch[]>([]);
  const [branchStatus, setBranchStatus] = useState<BranchPanelStatus>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const branchRestoreRef = useRef<HTMLElement | null>(null);

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

  useEffect(() => {
    if (!branchTenant) {
      branchRestoreRef.current?.focus();
      return;
    }
    branchRestoreRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setBranchStatus('loading');
    setBranches([]);
    void listTenantBranches(branchTenant.id)
      .then((next) => {
        setBranches(next);
        setBranchStatus(next.length === 0 ? 'empty' : 'success');
      })
      .catch((error: unknown) => {
        if (isApiError(error) || error instanceof ApiError) {
          if (error.status === 403) {
            setBranchStatus('denied');
            return;
          }
        }
        setBranchStatus('failure');
      });
  }, [branchTenant]);

  const copy = statusCopy(status);
  const branchMessage = branchPanelCopy(branchStatus);
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
          Scan tenant lifecycle status, open the outlet file for support, and apply MASTER suspend,
          expire, terminate, or reactivate moves with a reason.
        </p>
      </div>

      {copy && !targetStatus && !branchTenant ? (
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
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setBranchTenant(row)}
                      >
                        Outlet file
                      </Button>
                      {row.allowedTransitions.length === 0 ? (
                        <span className="text-muted">No transitions</span>
                      ) : (
                        row.allowedTransitions.map((next) => (
                          <Button
                            key={next}
                            type="button"
                            size="sm"
                            variant={next === 'TERMINATED' ? 'outline' : 'primary'}
                            onClick={() => openTransition(row, next)}
                          >
                            {transitionLabel(next)}
                          </Button>
                        ))
                      )}
                    </div>
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

      <Dialog open={branchTenant !== null} onOpenChange={(open) => !open && setBranchTenant(null)}>
        <DialogContent aria-describedby={undefined} className="max-w-3xl">
          <DialogTitle>Tenant outlet file</DialogTitle>
          <DialogDescription>
            Read-only support view of outlets for {branchTenant?.name ?? 'this tenant'}. MASTER does
            not edit branch master here.
          </DialogDescription>
          {branchMessage ? (
            <p
              id={branchStatusId}
              role="alert"
              className="mt-3 flex items-start gap-2 text-sm text-ink"
            >
              <MapPin className="mt-0.5 size-3.5 shrink-0 text-brand" aria-hidden="true" />
              <span>{branchMessage}</span>
            </p>
          ) : null}
          {branches.length > 0 ? (
            <div className="mt-4 overflow-x-auto border border-line">
              <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
                <caption className="sr-only">Tenant outlets</caption>
                <thead className="border-b border-line bg-elevated text-[11px] tracking-wide text-muted uppercase">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Code
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Outlet
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Type
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Licence
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Default
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {branches.map((branch) => (
                    <tr key={branch.id} className="border-b border-line last:border-b-0">
                      <td className="px-3 py-2 font-mono text-[11px]">{branch.branchCode}</td>
                      <td className="px-3 py-2">
                        <div className="text-ink">{branch.name}</div>
                        <div className="text-[11px] text-muted">
                          {branch.city}, {branch.state} {branch.pincode}
                        </div>
                      </td>
                      <td className="px-3 py-2">{branch.branchType}</td>
                      <td className="px-3 py-2 font-mono text-[11px]">
                        {branch.drugLicenseNumber}
                      </td>
                      <td className="px-3 py-2">{branch.defaultBranch ? 'Default' : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          <div className="mt-4 flex justify-end">
            <Button type="button" variant="outline" onClick={() => setBranchTenant(null)}>
              Close outlet file
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Reveal>
  );
}
