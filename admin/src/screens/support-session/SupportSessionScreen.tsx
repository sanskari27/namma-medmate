import { Reveal, Button, Input, Label } from '@atoms';
import { ApiError, isApiError } from '@/services/axios';
import { startImpersonation } from '@/services/impersonation';
import { Ban, Headset, ShieldAlert, ShieldCheck, Unplug } from 'lucide-react';
import { FormEvent, useId, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { sessionStarted, type RootState } from '@/store';

type PageStatus =
  'idle' | 'loading' | 'empty' | 'validation' | 'denied' | 'conflict' | 'failure' | 'success';

function statusCopy(status: PageStatus): { icon: typeof Ban; text: string } | null {
  switch (status) {
    case 'loading':
      return { icon: ShieldAlert, text: 'Opening support session…' };
    case 'empty':
      return {
        icon: Headset,
        text: 'Enter a tenant user email to diagnose their pharmacy context.',
      };
    case 'validation':
      return { icon: Ban, text: 'Enter a valid tenant user email.' };
    case 'denied':
      return { icon: Ban, text: 'Only MASTER can open a support session.' };
    case 'conflict':
      return {
        icon: ShieldAlert,
        text: 'A support session is already active. Exit it from the banner first.',
      };
    case 'failure':
      return { icon: Unplug, text: 'Could not open the support session. Try again.' };
    case 'success':
      return {
        icon: ShieldCheck,
        text: 'Support session active. The banner shows tenant identity until you exit.',
      };
    default:
      return null;
  }
}

export default function SupportSessionScreen() {
  const dispatch = useDispatch();
  const role = useSelector((s: RootState) => s.auth.user?.role);
  const active = useSelector((s: RootState) => s.auth.user?.impersonation);
  const master = role === 'admin_super' || Boolean(active);
  const emailId = useId();
  const statusId = useId();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<PageStatus>(master ? 'empty' : 'denied');
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!master || active) {
      setStatus(active ? 'conflict' : 'denied');
      return;
    }
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes('@')) {
      setStatus('validation');
      setMessage(null);
      return;
    }
    setStatus('loading');
    setMessage(null);
    try {
      const next = await startImpersonation(trimmed);
      dispatch(sessionStarted(next));
      setStatus('success');
      setMessage(
        next.impersonation
          ? `Entered ${next.impersonation.effectiveDisplayName} in ${next.impersonation.tenantName}.`
          : 'Support session started.',
      );
    } catch (error) {
      if (isApiError(error) || error instanceof ApiError) {
        if (error.status === 403) {
          setStatus('denied');
          setMessage(error.message);
          return;
        }
        if (error.status === 409) {
          setStatus('conflict');
          setMessage(error.message);
          return;
        }
        if (error.status === 400 || error.status === 404 || error.status === 422) {
          setStatus('validation');
          setMessage(error.message);
          return;
        }
      }
      setStatus('failure');
      setMessage(null);
    }
  };

  const copy = statusCopy(status);

  return (
    <Reveal className="space-y-5">
      <div className="border-b border-line pb-4">
        <h1 className="font-serif text-xl text-ink">Support session</h1>
        <p className="mt-1 text-sm text-muted">
          Enter a tenant user without their password. Exit restores your HQ operator session. This
          action is not written to the audit trail.
        </p>
      </div>

      {copy ? (
        <p
          id={statusId}
          role="status"
          className="flex items-start gap-2 rounded-sm border border-line bg-surface px-3 py-2 text-sm text-muted"
        >
          <copy.icon className="mt-0.5 size-3.5 shrink-0 text-brand" aria-hidden />
          <span>{message ?? copy.text}</span>
        </p>
      ) : null}

      {active ? (
        <div className="rounded-sm border border-warn/50 bg-elevated px-4 py-3 text-sm text-ink">
          <p>
            Active: <span className="font-medium">{active.effectiveDisplayName}</span> · tenant{' '}
            <span className="font-mono text-xs">{active.tenantName}</span>
          </p>
          <p className="mt-1 text-muted">
            Use <span className="text-ink">Exit support session</span> on the banner to restore{' '}
            {active.originalDisplayName}.
          </p>
        </div>
      ) : master ? (
        <form className="max-w-md space-y-4" onSubmit={(e) => void onSubmit(e)} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor={emailId}>Tenant user email</Label>
            <Input
              id={emailId}
              name="email"
              type="email"
              autoComplete="off"
              value={email}
              disabled={status === 'loading'}
              onChange={(e) => setEmail(e.target.value)}
              aria-describedby={statusId}
            />
          </div>
          <Button type="submit" disabled={status === 'loading'}>
            {status === 'loading' ? 'Entering…' : 'Enter support session'}
          </Button>
        </form>
      ) : null}
    </Reveal>
  );
}
