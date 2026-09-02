import { Reveal } from '@atoms';
import { isApiError } from '@/services/axios';
import { listPlatformActivity, type PlatformAuditEvent } from '@/services/workflows';
import { Ban, ShieldAlert, Unplug } from 'lucide-react';
import { useCallback, useEffect, useId, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';

type PageStatus = 'loading' | 'empty' | 'denied' | 'failure' | null;

function statusCopy(status: PageStatus): { icon: typeof Ban; text: string } | null {
  switch (status) {
    case 'loading':
      return { icon: ShieldAlert, text: 'Loading platform activity' };
    case 'empty':
      return { icon: ShieldAlert, text: 'No retained platform activity in the last 90 days.' };
    case 'denied':
      return { icon: Ban, text: 'Only authorized HQ desks can read platform activity.' };
    case 'failure':
      return { icon: Unplug, text: 'Could not load platform activity. Retry.' };
    default:
      return null;
  }
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

export default function PlatformActivityScreen() {
  const role = useSelector((s: RootState) => s.auth.user?.role);
  const master = role === 'admin_super';
  const statusId = useId();
  const [events, setEvents] = useState<PlatformAuditEvent[]>([]);
  const [status, setStatus] = useState<PageStatus>(master ? 'loading' : 'denied');

  const load = useCallback(async () => {
    if (!master) {
      setStatus('denied');
      return;
    }
    setStatus('loading');
    try {
      const next = await listPlatformActivity();
      setEvents(next);
      setStatus(next.length === 0 ? 'empty' : null);
    } catch (err) {
      if (isApiError(err) && err.code === 'FORBIDDEN') {
        setStatus('denied');
        return;
      }
      setStatus('failure');
    }
  }, [master]);

  useEffect(() => {
    void load();
  }, [load]);

  const copy = statusCopy(status);

  return (
    <Reveal className="flex flex-col gap-4 p-4">
      <header className="border-b border-line pb-3">
        <h1 className="font-serif text-2xl text-ink">Platform activity</h1>
        <p className="mt-1 text-sm text-muted">
          Login and business audit trail retained for 90 days across tenants.
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

      {events.length > 0 ? (
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">Platform activity log</caption>
          <thead>
            <tr className="border-b border-line text-muted">
              <th className="py-2 pr-3 font-medium">When (IST)</th>
              <th className="py-2 pr-3 font-medium">Action</th>
              <th className="py-2 pr-3 font-medium">Outcome</th>
              <th className="py-2 font-medium">Identity / origin</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id} className="border-b border-line text-ink">
                <td className="py-2 pr-3 font-mono text-xs tabular-nums">
                  {formatWhen(event.createdAt)}
                </td>
                <td className="py-2 pr-3 font-mono text-xs">{event.action}</td>
                <td className="py-2 pr-3">{event.outcome}</td>
                <td className="py-2 text-xs">
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
