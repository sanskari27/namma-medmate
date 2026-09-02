import { Reveal, Button } from '@atoms';
import { isApiError } from '@/services/axios';
import { decideApproval, listPendingApprovals, type ApprovalRequest } from '@/services/approvals';
import { AlertCircle, CheckCircle2, WifiOff } from 'lucide-react';
import { useCallback, useEffect, useId, useState } from 'react';

type PageStatus = 'loading' | 'empty' | 'denied' | 'failure' | 'success' | null;

function statusCopy(status: PageStatus): { icon: typeof AlertCircle; text: string } | null {
  switch (status) {
    case 'loading':
      return { icon: AlertCircle, text: 'Loading waiting sign-offs' };
    case 'empty':
      return { icon: AlertCircle, text: 'Nothing waiting for your sign-off at this counter.' };
    case 'denied':
      return { icon: AlertCircle, text: 'You are not an approver for pending till requests.' };
    case 'failure':
      return { icon: WifiOff, text: 'Could not load waiting sign-offs. Try again.' };
    case 'success':
      return { icon: CheckCircle2, text: 'Sign-off recorded.' };
    default:
      return null;
  }
}

export default function WaitingSignOffScreen() {
  const statusId = useId();
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [status, setStatus] = useState<PageStatus>('loading');
  const [banner, setBanner] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const next = await listPendingApprovals();
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

  async function onDecide(request: ApprovalRequest, outcome: 'APPROVED' | 'REJECTED') {
    setRowError(null);
    setBanner(null);
    try {
      await decideApproval(request.id, outcome, request.version);
      setBanner('Sign-off recorded.');
      setStatus('success');
      await load();
    } catch (err) {
      if (isApiError(err) && err.code === 'SELF_APPROVAL') {
        setRowError('You cannot approve your own request.');
        return;
      }
      if (isApiError(err) && (err.code === 'STALE_STATE' || err.code === 'THRESHOLD_CHANGED')) {
        setRowError('This request changed. Refresh and try again.');
        return;
      }
      if (isApiError(err) && err.code === 'FORBIDDEN') {
        setRowError('You are not an approver for this request.');
        return;
      }
      setRowError('Could not record that sign-off. Try again.');
    }
  }

  const copy = banner ? { icon: CheckCircle2, text: banner } : statusCopy(status);

  return (
    <Reveal className="flex flex-col gap-4 p-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-ink">Waiting for sign-off</h1>
        <p className="text-sm text-muted">Approve or send back till requests assigned to you.</p>
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
              className="flex flex-wrap items-center justify-between gap-3 rounded border border-line bg-surface px-3 py-2"
            >
              <div className="flex flex-col gap-0.5 text-sm">
                <span className="font-medium text-ink">{request.actionKey}</span>
                <span className="text-muted">
                  Amount {request.amountValue ?? '—'} · threshold {request.thresholdSnapshot ?? '—'}
                </span>
              </div>
              <div className="flex gap-2">
                <Button type="button" onClick={() => void onDecide(request, 'APPROVED')}>
                  Approve
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => void onDecide(request, 'REJECTED')}
                >
                  Send back
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </Reveal>
  );
}
