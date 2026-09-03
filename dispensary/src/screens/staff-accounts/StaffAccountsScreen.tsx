import { Reveal, Button } from '@atoms';
import { ApiError, isApiError } from '@/services/axios';
import { deactivateStaff, listStaff, type StaffAccount } from '@/services/staff';
import { AlertCircle, CheckCircle2, WifiOff } from 'lucide-react';
import { useCallback, useEffect, useId, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import { AddTillLoginDialog } from './components/add-till-login-dialog';
import { OffboardTillDialog } from './components/offboard-till-dialog';
import { TillPasswordDialog } from './components/till-password-dialog';
import { RolesDialog } from './components/roles-dialog';
import { BranchesDialog } from './components/branches-dialog';
import { TillRowMenu } from './components/till-row-menu';

type PageStatus = 'loading' | 'empty' | 'denied' | 'failure' | 'success' | null;

function statusCopy(status: PageStatus): { icon: typeof AlertCircle; text: string } | null {
  switch (status) {
    case 'loading':
      return { icon: AlertCircle, text: 'Loading staff accounts' };
    case 'empty':
      return {
        icon: AlertCircle,
        text: 'No additional staff accounts yet. Add a staff member to this pharmacy.',
      };
    case 'denied':
      return {
        icon: AlertCircle,
        text: 'Only the pharmacy owner can add or remove staff access.',
      };
    case 'failure':
      return {
        icon: WifiOff,
        text: 'Could not load staff accounts. Try again.',
      };
    case 'success':
      return {
        icon: CheckCircle2,
        text: 'Staff saved. They cannot sign in until their registration is approved.',
      };
    default:
      return null;
  }
}

function roleLabel(row: StaffAccount): string {
  if (row.role === 'pharmacy_owner') {
    return 'Owner';
  }
  return row.kind === 'PHARMACIST' ? 'Pharmacist' : 'Staff';
}

function statusLabel(row: StaffAccount): string {
  if (row.role === 'pharmacy_owner') {
    return 'Active';
  }
  if (row.status === 'PENDING') {
    return 'Pending approval';
  }
  if (row.status === 'TERMINATED') {
    return 'Access removed';
  }
  return 'Active';
}

function railClass(row: StaffAccount): string {
  if (row.role === 'pharmacy_owner') {
    return 'bg-muted';
  }
  if (row.status === 'PENDING') {
    return 'bg-warn';
  }
  return 'bg-brand';
}

export default function StaffAccountsScreen() {
  const role = useSelector((s: RootState) => s.auth.user?.role);
  const owner = role === 'pharmacy_owner';
  const statusId = useId();
  const [items, setItems] = useState<StaffAccount[]>([]);
  const [status, setStatus] = useState<PageStatus>(owner ? 'loading' : 'denied');
  const [banner, setBanner] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [passwordFor, setPasswordFor] = useState<StaffAccount | null>(null);
  const [rolesFor, setRolesFor] = useState<StaffAccount | null>(null);
  const [branchesFor, setBranchesFor] = useState<StaffAccount | null>(null);
  const [offboardFor, setOffboardFor] = useState<StaffAccount | null>(null);
  const [offboardBusy, setOffboardBusy] = useState(false);

  const load = useCallback(async () => {
    if (!owner) {
      setStatus('denied');
      return;
    }
    setStatus('loading');
    try {
      const next = await listStaff();
      setItems(next);
      setStatus(next.some((row) => row.role === 'pharmacy_staff') ? null : 'empty');
    } catch {
      setStatus('failure');
    }
  }, [owner]);

  useEffect(() => {
    void load();
  }, [load]);

  const copy = banner ? { icon: CheckCircle2, text: banner } : statusCopy(status);
  const waiting = items.filter((row) => row.status === 'PENDING').length;
  const onTill = items.filter(
    (row) => row.role === 'pharmacy_staff' && row.status !== 'PENDING',
  ).length;

  const onDeactivate = async () => {
    if (!offboardFor) {
      return;
    }
    setOffboardBusy(true);
    setBanner(null);
    try {
      await deactivateStaff(offboardFor.id);
      setOffboardFor(null);
      setBanner('Access removed. Their record remains on file.');
      const next = await listStaff();
      setItems(next);
      setStatus(next.some((row) => row.role === 'pharmacy_staff') ? 'success' : 'empty');
    } catch (error) {
      if (isApiError(error) || error instanceof ApiError) {
        if (error.status === 403 || error.status === 404) {
          setStatus('denied');
          return;
        }
        if (error.status === 409) {
          setBanner('Access has already been removed.');
          setStatus('success');
          return;
        }
      }
      setStatus('failure');
    } finally {
      setOffboardBusy(false);
    }
  };

  return (
    <Reveal className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">Staff accounts</h1>
          <p className="mt-1 text-sm text-muted">
            Manage who can sign in at this pharmacy. New staff remain pending until their
            registration is approved.
          </p>
        </div>
        {owner ? (
          <Button type="button" onClick={() => setAddOpen(true)}>
            Add staff
          </Button>
        ) : null}
      </div>

      {owner && status !== 'loading' && status !== 'failure' ? (
        <p className="flex flex-wrap gap-3 text-xs text-muted">
          <span>{onTill} with access</span>
          <span>{waiting} pending approval</span>
        </p>
      ) : null}

      {copy && !addOpen ? (
        <p
          id={statusId}
          role="alert"
          className="flex items-start gap-2 border border-line bg-surface px-3 py-2 text-sm text-ink"
        >
          <copy.icon className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
          <span>{copy.text}</span>
        </p>
      ) : null}

      {owner ? (
        <>
          <ul className="divide-y divide-line border border-line bg-surface">
            {items.map((row) => (
              <li key={row.id} className="flex items-stretch">
                <span className={`w-1 shrink-0 ${railClass(row)}`} aria-hidden="true" />
                <div className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{row.displayName}</p>
                    <p className="truncate font-mono text-[11px] text-muted">{row.email}</p>
                  </div>
                  <p className="hidden text-xs text-muted sm:block">{roleLabel(row)}</p>
                  <p className="text-xs text-ink">{statusLabel(row)}</p>
                  {row.role === 'pharmacy_staff' ? (
                    <TillRowMenu
                      staff={row}
                      onPassword={() => setPasswordFor(row)}
                      onRoles={() => setRolesFor(row)}
                      onBranches={() => setBranchesFor(row)}
                      onOffboard={() => setOffboardFor(row)}
                    />
                  ) : (
                    <span className="w-8" aria-hidden="true" />
                  )}
                </div>
              </li>
            ))}
          </ul>

          <AddTillLoginDialog
            open={addOpen}
            onOpenChange={setAddOpen}
            onSuccess={async (message) => {
              setBanner(message);
              setStatus('success');
              const next = await listStaff();
              setItems(next);
            }}
          />
          {passwordFor ? (
            <TillPasswordDialog
              staff={passwordFor}
              open
              onOpenChange={(open) => {
                if (!open) {
                  setPasswordFor(null);
                }
              }}
              onSuccess={(message) => {
                setBanner(message);
                setStatus('success');
              }}
            />
          ) : null}
          {rolesFor ? (
            <RolesDialog
              staff={rolesFor}
              open
              onOpenChange={(open) => {
                if (!open) {
                  setRolesFor(null);
                }
              }}
              onSuccess={(message) => {
                setBanner(message);
                setStatus('success');
              }}
            />
          ) : null}
          {branchesFor ? (
            <BranchesDialog
              staff={branchesFor}
              open
              onOpenChange={(open) => {
                if (!open) {
                  setBranchesFor(null);
                }
              }}
              onSuccess={(message) => {
                setBanner(message);
                setStatus('success');
              }}
            />
          ) : null}
          {offboardFor ? (
            <OffboardTillDialog
              staff={offboardFor}
              open
              busy={offboardBusy}
              onOpenChange={(open) => {
                if (!open) {
                  setOffboardFor(null);
                }
              }}
              onConfirm={() => void onDeactivate()}
            />
          ) : null}
        </>
      ) : null}
    </Reveal>
  );
}
