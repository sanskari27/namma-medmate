import { CounterFeatureSlider, CounterFeatureStrip } from '@molecules';
import { Button, Input, Label, Reveal } from '@atoms';
import { ROUTES } from '@/libs/constants/routes.const';
import { ApiError, isApiError, requestPasswordReset } from '@/services/auth';
import { AlertCircle, Mail, WifiOff } from 'lucide-react';
import { FormEvent, useId, useState } from 'react';
import { Link } from 'react-router-dom';

type FormStatus =
  'empty' | 'validation' | 'loading' | 'denied' | 'conflict' | 'failure' | 'success';

function statusCopy(status: FormStatus): { icon: typeof AlertCircle; text: string } | null {
  switch (status) {
    case 'validation':
      return { icon: AlertCircle, text: 'Enter the owner email for this pharmacy.' };
    case 'denied':
      return {
        icon: AlertCircle,
        text: 'This counter cannot start an email reset. Ask the owner.',
      };
    case 'conflict':
      return {
        icon: AlertCircle,
        text: 'A reset is already in flight. Wait, then try from this counter again.',
      };
    case 'failure':
      return {
        icon: WifiOff,
        text: 'Could not reach the server. Try the owner reset from this counter again.',
      };
    case 'success':
      return {
        icon: Mail,
        text: 'If this owner email can receive a reset link, it is on the way. Staff passwords are reset from Staff accounts.',
      };
    default:
      return null;
  }
}

export default function ForgotPasswordScreen() {
  const statusId = useId();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<FormStatus>('empty');
  const banner = statusCopy(status);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim()) {
      setStatus('validation');
      return;
    }
    setStatus('loading');
    try {
      await requestPasswordReset(email);
      setStatus('success');
    } catch (error) {
      if (isApiError(error) || error instanceof ApiError) {
        if (error.status === 401 || error.status === 403) {
          setStatus('denied');
          return;
        }
        if (error.status === 409) {
          setStatus('conflict');
          return;
        }
      }
      setStatus('failure');
    }
  };

  return (
    <div className="grid min-h-screen bg-canvas md:grid-cols-[minmax(0,1fr)_28rem]">
      <CounterFeatureSlider />
      <section className="flex min-h-screen flex-col border-l-4 border-brand bg-surface">
        <CounterFeatureStrip />
        <Reveal className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-12">
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div>
              <h1 className="text-xl font-semibold text-ink">Owner password reset</h1>
              <p className="mt-1 text-sm text-muted">
                Email a time-limited link to the pharmacy owner. Staff passwords are reset from
                Staff accounts.
              </p>
            </div>
            {banner ? (
              <p
                id={statusId}
                role="alert"
                className="flex items-start gap-2 border border-line bg-canvas px-3 py-2 text-sm text-ink"
              >
                <banner.icon className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
                <span>{banner.text}</span>
              </p>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="email">Owner email</Label>
              <Input
                id="email"
                type="email"
                name="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={status === 'validation'}
                aria-describedby={banner ? statusId : undefined}
              />
            </div>
            <Button type="submit" className="w-full" disabled={status === 'loading'}>
              {status === 'loading' ? 'Sending reset' : 'Send owner reset'}
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
