import { CounterFeatureSlider, CounterFeatureStrip } from '@/components/auth/CounterFeatureSlider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Reveal } from '@/components/ui/Reveal';
import { ROUTES } from '@/libs/constants/routes.const';
import { ApiError, completePasswordReset, isApiError } from '@/services/auth';
import { AlertCircle, CheckCircle2, WifiOff } from 'lucide-react';
import { FormEvent, useId, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

type FormStatus =
  | 'idle'
  | 'empty'
  | 'validation'
  | 'loading'
  | 'denied'
  | 'conflict'
  | 'failure'
  | 'success';

function statusCopy(status: FormStatus): { icon: typeof AlertCircle; text: string } | null {
  switch (status) {
    case 'empty':
      return {
        icon: AlertCircle,
        text: 'Open the reset link from the owner email. This page needs that token.',
      };
    case 'validation':
      return {
        icon: AlertCircle,
        text: 'Use at least eight characters, and type the same password twice.',
      };
    case 'denied':
      return {
        icon: AlertCircle,
        text: 'This reset link is expired or already used. Request a new owner email.',
      };
    case 'conflict':
      return {
        icon: AlertCircle,
        text: 'That password was used before on this counter. Pick a new one.',
      };
    case 'failure':
      return {
        icon: WifiOff,
        text: 'Could not reach the server. Try finishing the owner reset from this counter.',
      };
    case 'success':
      return {
        icon: CheckCircle2,
        text: 'Owner password updated. Sign in at this counter with the new password.',
      };
    default:
      return null;
  }
}

export default function ResetPasswordPage() {
  const statusId = useId();
  const [params] = useSearchParams();
  const token = params.get('token')?.trim() ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<FormStatus>(token ? 'idle' : 'empty');

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) {
      setStatus('empty');
      return;
    }
    if (password.length < 8 || password !== confirm) {
      setStatus('validation');
      return;
    }
    setStatus('loading');
    try {
      await completePasswordReset(token, password);
      setStatus('success');
    } catch (error) {
      if (isApiError(error) || error instanceof ApiError) {
        if (error.status === 422 && error.code === 'PASSWORD_REUSED') {
          setStatus('conflict');
          return;
        }
        if (error.status === 401 || error.status === 403 || error.status === 422) {
          setStatus('denied');
          return;
        }
      }
      setStatus('failure');
    }
  };

  const copy = statusCopy(status);

  return (
    <div className="grid min-h-screen bg-canvas md:grid-cols-[minmax(0,1fr)_28rem]">
      <CounterFeatureSlider />
      <section className="flex min-h-screen flex-col border-l-4 border-brand bg-surface">
        <CounterFeatureStrip />
        <Reveal className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-12">
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div>
              <h1 className="text-xl font-semibold text-ink">Set a new owner password</h1>
              <p className="mt-1 text-sm text-muted">
                Choose eight or more characters that this counter has not used before.
              </p>
            </div>
            {copy ? (
              <p
                id={statusId}
                role="alert"
                className="flex items-start gap-2 border border-line bg-canvas px-3 py-2 text-sm text-ink"
              >
                <copy.icon className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
                <span>{copy.text}</span>
              </p>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                name="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={!token || status === 'success'}
                aria-invalid={status === 'validation'}
                aria-describedby={copy ? statusId : undefined}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                type="password"
                name="confirm"
                autoComplete="new-password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                disabled={!token || status === 'success'}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={status === 'loading' || !token || status === 'success'}
            >
              {status === 'loading' ? 'Saving password' : 'Save owner password'}
            </Button>
            <p className="text-sm text-muted">
              <Link to={ROUTES.LOGIN} className="text-brand underline-offset-2 hover:underline">
                Back to counter sign in
              </Link>
            </p>
          </form>
        </Reveal>
      </section>
    </div>
  );
}
