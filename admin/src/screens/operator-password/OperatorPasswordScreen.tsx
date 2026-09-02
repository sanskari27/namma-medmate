import { FormEvent, useEffect, useId, useRef, useState } from 'react';
import { Ban, ShieldAlert, ShieldCheck, Unplug } from 'lucide-react';
import { Reveal, Button, Input, Label } from '@atoms';
import { adminResetPassword, ApiError, isApiError } from '@/services/auth';

type FormStatus =
  'empty' | 'validation' | 'loading' | 'denied' | 'conflict' | 'failure' | 'success';

function statusCopy(status: FormStatus): { icon: typeof Ban; text: string } | null {
  switch (status) {
    case 'validation':
      return {
        icon: ShieldAlert,
        text: 'Enter the operator email and a temporary secret of at least eight characters.',
      };
    case 'denied':
      return {
        icon: Ban,
        text: 'That operator is not a sub-account you created, or it is not visible to this HQ session.',
      };
    case 'conflict':
      return {
        icon: ShieldAlert,
        text: 'That secret is already in this operator history. Choose another.',
      };
    case 'failure':
      return {
        icon: Unplug,
        text: 'The platform API did not reset the operator. Retry from this console.',
      };
    case 'success':
      return {
        icon: ShieldCheck,
        text: 'Temporary HQ secret set. The operator must rotate it on next authentication.',
      };
    default:
      return null;
  }
}

export default function OperatorPasswordScreen() {
  const statusId = useId();
  const emailId = useId();
  const restoreRef = useRef<HTMLElement | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<FormStatus>('empty');
  const banner = statusCopy(status);

  useEffect(() => {
    restoreRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.getElementById(emailId)?.focus();
    return () => {
      restoreRef.current?.focus();
    };
  }, [emailId]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
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
          <h1 className="font-serif text-2xl text-ink">Reset operator password</h1>
          <p className="mt-1 font-mono text-xs text-muted">
            MASTER / creating-admin only. Sub-accounts cannot use the email reset path.
          </p>
        </div>
        {banner ? (
          <p
            id={statusId}
            role="alert"
            className="flex items-start gap-2 border border-line bg-elevated px-3 py-2 text-sm text-ink"
          >
            <banner.icon className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />
            <span>{banner.text}</span>
          </p>
        ) : null}
        <div className="space-y-1.5">
          <Label htmlFor={emailId}>Operator email</Label>
          <Input
            id={emailId}
            type="email"
            autoComplete="off"
            className="font-mono"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={status === 'validation'}
            aria-describedby={banner ? statusId : undefined}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="temp-password">Temporary secret</Label>
          <Input
            id="temp-password"
            type="password"
            autoComplete="new-password"
            className="font-mono"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="temp-confirm">Confirm temporary secret</Label>
          <Input
            id="temp-confirm"
            type="password"
            autoComplete="new-password"
            className="font-mono"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
          />
        </div>
        <Button type="submit" disabled={status === 'loading'}>
          {status === 'loading' ? 'Saving operator secret' : 'Set operator secret'}
        </Button>
      </form>
    </Reveal>
  );
}
