import { FormEvent, useEffect, useId, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { AlertCircle, CheckCircle2, WifiOff } from 'lucide-react';
import { Reveal } from '@/components/Reveal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { adminResetPassword, ApiError, isApiError } from '@/services/auth';
import type { RootState } from '@/store';

type FormStatus =
  | 'empty'
  | 'validation'
  | 'loading'
  | 'denied'
  | 'conflict'
  | 'failure'
  | 'success';

function statusCopy(status: FormStatus): { icon: typeof AlertCircle; text: string } | null {
  switch (status) {
    case 'validation':
      return {
        icon: AlertCircle,
        text: 'Enter the staff email and a temporary password of at least eight characters.',
      };
    case 'denied':
      return {
        icon: AlertCircle,
        text: 'That staff login is not on this pharmacy, or only the owner who created it can reset it.',
      };
    case 'conflict':
      return { icon: AlertCircle, text: 'That temporary password was already used on this till. Pick another.' };
    case 'failure':
      return { icon: WifiOff, text: 'Could not reach the server. Reset the staff password from this counter again.' };
    case 'success':
      return {
        icon: CheckCircle2,
        text: 'Temporary password set. The staff member must change it at next sign-in.',
      };
    default:
      return null;
  }
}

export default function StaffPasswordPage() {
  const role = useSelector((s: RootState) => s.auth.user?.role);
  const statusId = useId();
  const emailId = useId();
  const restoreRef = useRef<HTMLElement | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<FormStatus>(role === 'pharmacy_owner' ? 'empty' : 'denied');
  const banner = statusCopy(status);

  useEffect(() => {
    restoreRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (role === 'pharmacy_owner') {
      document.getElementById(emailId)?.focus();
    }
    return () => {
      restoreRef.current?.focus();
    };
  }, [emailId, role]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (role !== 'pharmacy_owner') {
      setStatus('denied');
      return;
    }
    if (!email.trim() || password.length < 8 || password !== confirm) {
      setStatus('validation');
      return;
    }
    setStatus('loading');
    try {
      await adminResetPassword(email, password);
      setStatus('success');
    } catch (error) {
      if (isApiError(error) || error instanceof ApiError) {
        if (error.status === 401 || error.status === 403 || error.status === 404) {
          setStatus('denied');
          return;
        }
        if (error.status === 409 || (error.status === 422 && error.code === 'PASSWORD_REUSED')) {
          setStatus('conflict');
          return;
        }
      }
      setStatus('failure');
    }
  };

  return (
    <Reveal>
      <form onSubmit={onSubmit} className="max-w-md space-y-4" noValidate>
        <div>
          <h1 className="text-xl font-semibold text-ink">Reset a staff password</h1>
          <p className="mt-1 text-sm text-muted">
            Only the owner who created the till login can set a temporary password. Staff change it at next sign-in.
          </p>
        </div>
        {banner ? (
          <p
            id={statusId}
            role="alert"
            className="flex items-start gap-2 border border-line bg-surface px-3 py-2 text-sm text-ink"
          >
            <banner.icon className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
            <span>{banner.text}</span>
          </p>
        ) : null}
        <div className="space-y-1.5">
          <Label htmlFor={emailId}>Staff email</Label>
          <Input
            id={emailId}
            type="email"
            autoComplete="off"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={role !== 'pharmacy_owner'}
            aria-invalid={status === 'validation'}
            aria-describedby={banner ? statusId : undefined}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="temp-password">Temporary password</Label>
          <Input
            id="temp-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={role !== 'pharmacy_owner'}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="temp-confirm">Confirm temporary password</Label>
          <Input
            id="temp-confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            disabled={role !== 'pharmacy_owner'}
          />
        </div>
        <Button type="submit" disabled={status === 'loading' || role !== 'pharmacy_owner'}>
          {status === 'loading' ? 'Saving till password' : 'Set till password'}
        </Button>
      </form>
    </Reveal>
  );
}
