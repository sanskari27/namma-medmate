import { Reveal } from '@atoms';
import { isApiError } from '@/services/axios';
import { listAuditEvents, type AuditEvent } from '@/services/approvals';
import { AlertCircle, WifiOff } from 'lucide-react';
import { useCallback, useEffect, useId, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';

type PageStatus = 'loading' | 'empty' | 'denied' | 'failure' | null;

function statusCopy(status: PageStatus): { icon: typeof AlertCircle; text: string } | null {
  switch (status) {
    case 'loading':
      return { icon: AlertCircle, text: 'Loading floor activity' };
    case 'empty':
      return { icon: AlertCircle, text: 'No recent floor activity in the last 90 days.' };
    case 'denied':
      return { icon: AlertCircle, text: 'You need Approvals access to view floor activity.' };
    case 'failure':
      return { icon: WifiOff, text: 'Could not load floor activity. Try again.' };
    default:
      return null;
  }
}

function hasApprovals(modules: string[] | undefined): boolean {
  return modules?.includes('APPROVALS') === true;
}

function formatWhen(value: string): string {
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

export default function FloorActivityScreen() {
  const modules = useSelector((s: RootState) => s.auth.user?.modules);
  const role = useSelector((s: RootState) => s.auth.user?.role);
  const allowed = role === 'pharmacy_owner' || hasApprovals(modules);
  const statusId = useId();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [status, setStatus] = useState<PageStatus>(allowed ? 'loading' : 'denied');

  const load = useCallback(async () => {
    if (!allowed) {
      setStatus('denied');
      return;
    }
    setStatus('loading');
    try {
      const next = await listAuditEvents();
      setEvents(next);
      setStatus(next.length === 0 ? 'empty' : null);
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

  const copy = statusCopy(status);

  return (
    <Reveal className="flex flex-col gap-4 p-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-ink">Floor activity</h1>
        <p className="text-sm text-muted">
          Sign-ins and business actions for this pharmacy, kept for 90 days.
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

      {events.length > 0 ? (
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">Floor activity log</caption>
          <thead>
            <tr className="border-b border-line text-muted">
              <th className="py-2 pr-3 font-medium">When (IST)</th>
              <th className="py-2 pr-3 font-medium">Action</th>
              <th className="py-2 pr-3 font-medium">Outcome</th>
              <th className="py-2 font-medium">Who / from</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id} className="border-b border-line/70 text-ink">
                <td className="py-2 pr-3 tabular-nums">{formatWhen(event.createdAt)}</td>
                <td className="py-2 pr-3">{event.action}</td>
                <td className="py-2 pr-3">{event.outcome}</td>
                <td className="py-2">
                  {event.attemptedIdentity ?? event.userId ?? '—'}
                  {event.sourceIp ? ` · ${event.sourceIp}` : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </Reveal>
  );
}
