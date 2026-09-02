import { FormEvent, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { Ban, Mail, ShieldAlert, Unplug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HqFeatureSlider, HqStatusTicker } from '@/components/auth/HqFeatureSlider';
import { Reveal } from '@/components/Reveal';
import { ROUTES } from '@/libs/constants/routes.const';
import { ApiError, isApiError, requestPasswordReset } from '@/services/auth';

type FormStatus = 'empty' | 'validation' | 'loading' | 'denied' | 'conflict' | 'failure' | 'success';

function statusCopy(status: FormStatus): { icon: typeof Ban; text: string } | null {
  switch (status) {
    case 'validation':
      return { icon: ShieldAlert, text: 'Enter the HQ operator email.' };
    case 'denied':
      return { icon: Ban, text: 'This console cannot start an email reset.' };
    case 'conflict':
      return { icon: ShieldAlert, text: 'An HQ reset is already queued. Retry shortly from this console.' };
    case 'failure':
      return { icon: Unplug, text: 'The platform API did not accept the reset. Retry from this console.' };
    case 'success':
      return { icon: Mail, text: 'If this MASTER account can reset by email, a time-limited HQ link was queued.' };
    default:
      return null;
  }
}

export default function ForgotPasswordPage() {
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
    <div className="grid min-h-screen bg-canvas md:grid-cols-[28rem_minmax(0,1fr)]">
      <section className="flex min-h-screen flex-col border-r border-line bg-surface">
        <HqStatusTicker />
        <Reveal className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-12">
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div>
              <h1 className="font-serif text-2xl text-ink">HQ password reset</h1>
              <p className="mt-1 text-sm text-muted">
                MASTER operators receive a time-limited email link. Platform sub-accounts are reset from Operator
                password.
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
              <Label htmlFor="email">HQ email</Label>
              <Input
                id="email"
                type="email"
                name="email"
                autoComplete="username"
                className="font-mono"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={status === 'validation'}
                aria-describedby={banner ? statusId : undefined}
              />
            </div>
            <Button type="submit" className="w-full" disabled={status === 'loading'}>
              {status === 'loading' ? 'Queueing reset' : 'Queue HQ reset'}
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
