import { Reveal, Button } from '@atoms';
import { isApiError } from '@/services/axios';
import { decideHqSignOff, listHqSignOffs, type SignOffRequest } from '@/services/workflows';
import { Ban, ShieldAlert, ShieldCheck, Unplug } from 'lucide-react';
import { useCallback, useEffect, useId, useState } from 'react';

type PageStatus = 'loading' | 'empty' | 'denied' | 'failure' | 'success' | null;

function statusCopy(status: PageStatus): { icon: typeof Ban; text: string } | null {
  switch (status) {
    case 'loading':
      return { icon: ShieldAlert, text: 'Loading HQ sign-offs' };
    case 'empty':
      return { icon: ShieldAlert, text: 'No requests await this HQ desk.' };
    case 'denied':
      return { icon: Ban, text: 'This HQ desk is not an approver for pending requests.' };
    case 'failure':
      return { icon: Unplug, text: 'Could not load HQ sign-offs. Retry.' };
    case 'success':
      return { icon: ShieldCheck, text: 'HQ decision recorded.' };
    default:
      return null;
  }
}

export default function HqSignOffsScreen() {
  const statusId = useId();
  const [requests, setRequests] = useState<SignOffRequest[]>([]);
  const [status, setStatus] = useState<PageStatus>('loading');
  const [banner, setBanner] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const next = await listHqSignOffs();
      setRequests(next);
      setStatus(next.length === 0 ? 'empty' : null);
    } catch (err) {
      if (isApiError(err) && err.code === 'FORBIDDEN') {
        setStatus('denied');
        return;
      }
      setStatus('failure');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onDecide(request: SignOffRequest, outcome: 'APPROVED' | 'REJECTED') {
    setRowError(null);
    setBanner(null);
    try {
      await decideHqSignOff(request.id, outcome, request.version);
      setBanner('HQ decision recorded.');
      setStatus('success');
      await load();
    } catch (err) {
      if (isApiError(err) && err.code === 'SELF_APPROVAL') {
        setRowError('Self-approval is blocked for this workflow.');
        return;
      }
      if (isApiError(err) && (err.code === 'STALE_STATE' || err.code === 'THRESHOLD_CHANGED')) {
        setRowError('Stale request. Reload the queue and decide again.');
        return;
      }
      if (isApiError(err) && err.code === 'FORBIDDEN') {
        setRowError('This HQ desk cannot decide that request.');
        return;
      }
      setRowError('Could not record the HQ decision.');
    }
  }

  const copy = banner ? { icon: ShieldCheck, text: banner } : statusCopy(status);

  return (
    <Reveal className="flex flex-col gap-4 p-4">
      <header className="border-b border-line pb-3">
        <h1 className="font-serif text-2xl text-ink">HQ sign-offs</h1>
        <p className="mt-1 text-sm text-muted">
          Decide pending platform and tenant requests assigned to this desk.
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

      {rowError ? (
        <p role="alert" className="text-sm text-danger">
          {rowError}
        </p>
      ) : null}

      {requests.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {requests.map((request) => (
            <li
              key={request.id}
              className="flex flex-wrap items-center justify-between gap-3 border border-line bg-surface px-3 py-2"
            >
              <div className="grid gap-0.5 text-sm">
                <span className="font-mono text-xs text-ink">{request.actionKey}</span>
                <span className="text-muted">
                  Tenant {request.tenantId.slice(0, 8)} · amount {request.amountValue ?? '—'}
                </span>
              </div>
              <div className="flex gap-2">
                <Button type="button" onClick={() => void onDecide(request, 'APPROVED')}>
                  Approve
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void onDecide(request, 'REJECTED')}
                >
                  Reject
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </Reveal>
  );
}
