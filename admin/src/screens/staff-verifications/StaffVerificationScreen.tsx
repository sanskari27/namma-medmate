import { Reveal, Button } from '@atoms';
import { ApiError, isApiError } from '@/services/axios';
import { listStaffVerifications, type StaffVerificationItem } from '@/services/staff';
import { Ban, ShieldAlert, ShieldCheck, Unplug } from 'lucide-react';
import { useCallback, useEffect, useId, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import { ApprovePackDialog } from './components/approve-pack-dialog';

type PageStatus = 'loading' | 'empty' | 'denied' | 'failure' | 'success' | null;

function statusCopy(status: PageStatus): { icon: typeof Ban; text: string } | null {
  switch (status) {
    case 'loading':
      return { icon: ShieldAlert, text: 'Loading pending approvals' };
    case 'empty':
      return { icon: ShieldAlert, text: 'No staff pending approval.' };
    case 'denied':
      return { icon: Ban, text: 'You do not have permission to approve staff.' };
    case 'failure':
      return { icon: Unplug, text: 'Could not load pending approvals. Try again.' };
    case 'success':
      return {
        icon: ShieldCheck,
        text: 'Approved. That person can now sign in.',
      };
    default:
      return null;
  }
}

export default function StaffVerificationScreen() {
  const role = useSelector((s: RootState) => s.auth.user?.role);
  const allowed = role === 'admin_super' || role === 'admin_verification';
  const statusId = useId();
  const [items, setItems] = useState<StaffVerificationItem[]>([]);
  const [status, setStatus] = useState<PageStatus>(allowed ? 'loading' : 'denied');
  const [reviewing, setReviewing] = useState<StaffVerificationItem | null>(null);

  const load = useCallback(async () => {
    if (!allowed) {
      setStatus('denied');
      return;
    }
    setStatus('loading');
    try {
      const next = await listStaffVerifications();
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

  const copy = statusCopy(status);

  return (
    <Reveal className="space-y-5">
      <div className="border-b border-line pb-4">
        <h1 className="font-serif text-xl text-ink">Staff approvals</h1>
        <p className="mt-1 text-sm text-muted">
          Review each registration, record verification notes, then approve access.
        </p>
      </div>
      {copy && !reviewing ? (
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
        <>
          <ol className="space-y-2">
            {items.map((row, index) => (
              <li key={row.id} className="border border-line bg-surface">
                <div className="flex items-stretch">
                  <div className="flex w-10 shrink-0 flex-col items-center justify-center border-r border-line bg-elevated font-mono text-[11px] text-muted">
                    {String(index + 1).padStart(2, '0')}
                  </div>
                  <div className="min-w-0 flex-1 px-3 py-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-sm text-ink">{row.displayName}</p>
                      <p className="text-[11px] text-brand">
                        {row.kind === 'PHARMACIST' ? 'Pharmacist' : 'Staff'}
                      </p>
                    </div>
                    <p className="mt-1 truncate font-mono text-[11px] text-muted">{row.email}</p>
                    <p className="mt-2 font-mono text-[11px] text-ink">{row.tenantId ?? 'HQ'}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {row.licenseNumber
                        ? `Licence number ${row.licenseNumber}`
                        : 'No licence number on file'}
                    </p>
                  </div>
                  <div className="flex items-center border-l border-line px-3">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setReviewing(row)}
                    >
                      {`Review ${row.displayName}`}
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ol>
          {reviewing ? (
            <ApprovePackDialog
              pack={reviewing}
              open
              onOpenChange={(open) => {
                if (!open) {
                  setReviewing(null);
                }
              }}
              onSuccess={async () => {
                setStatus('success');
                const next = await listStaffVerifications();
                setItems(next);
                if (next.length === 0) {
                  setStatus('success');
                }
              }}
            />
          ) : null}
        </>
      ) : null}
    </Reveal>
  );
}
