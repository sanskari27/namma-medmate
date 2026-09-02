import { FormEvent, useId, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Ban, ShieldAlert, ShieldCheck, Unplug } from 'lucide-react';
import { Button, Input, Label, Reveal } from '@atoms';
import { HqFeatureSlider, HqStatusTicker } from '@molecules';
import { ROUTES } from '@/libs/constants/routes.const';
import { ApiError, completePasswordReset, isApiError } from '@/services/auth';

type FormStatus =
  'idle' | 'empty' | 'validation' | 'loading' | 'denied' | 'conflict' | 'failure' | 'success';

function statusCopy(status: FormStatus): { icon: typeof Ban; text: string } | null {
  switch (status) {
    case 'empty':
      return {
        icon: ShieldAlert,
        text: 'Open the HQ reset link from email. This console needs that token.',
      };
    case 'validation':
      return {
        icon: ShieldAlert,
        text: 'Use at least eight characters, and confirm the same HQ password.',
      };
    case 'denied':
      return {
        icon: Ban,
        text: 'This HQ reset link is expired or spent. Queue a new MASTER reset.',
      };
    case 'conflict':
      return {
        icon: ShieldAlert,
        text: 'That password is already in this operator history. Choose another.',
      };
    case 'failure':
      return {
        icon: Unplug,
        text: 'The platform API did not save the password. Retry from this console.',
      };
    case 'success':
      return {
        icon: ShieldCheck,
        text: 'HQ password updated. Authenticate on this console with the new secret.',
      };
    default:
      return null;
  }
}

export default function ResetPasswordScreen() {
  const statusId = useId();
  const [params] = useSearchParams();
  const token = params.get('token')?.trim() ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<FormStatus>(token ? 'idle' : 'empty');
  const banner = statusCopy(status);

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

  return (
    <div className="grid min-h-screen bg-canvas md:grid-cols-[28rem_minmax(0,1fr)]">
      <section className="flex min-h-screen flex-col border-r border-line bg-surface">
        <HqStatusTicker />
        <Reveal className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-12">
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div>
              <h1 className="font-serif text-2xl text-ink">Set HQ password</h1>
              <p className="mt-1 text-sm text-muted">
                Eight or more characters, never reused on this operator.
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
              <Label htmlFor="password">New HQ password</Label>
              <Input
                id="password"
                type="password"
                name="password"
                autoComplete="new-password"
                className="font-mono"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={!token || status === 'success'}
                aria-invalid={status === 'validation'}
                aria-describedby={banner ? statusId : undefined}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirm HQ password</Label>
              <Input
                id="confirm"
                type="password"
                name="confirm"
                autoComplete="new-password"
                className="font-mono"
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
              {status === 'loading' ? 'Saving HQ password' : 'Save HQ password'}
            </Button>
            <p className="text-sm text-muted">
              <Link to={ROUTES.LOGIN} className="text-brand underline-offset-2 hover:underline">
                Back to HQ sign in
              </Link>
            </p>
          </form>
        </Reveal>
      </section>
      <HqFeatureSlider />
    </div>
  );
}
