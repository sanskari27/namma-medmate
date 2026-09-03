import { CounterFeatureSlider, CounterFeatureStrip } from '@molecules';
import { Button, Input, Label, Reveal } from '@atoms';
import { ROUTES } from '@/libs/constants/routes.const';
import { ApiError, isApiError, registerPharmacy } from '@/services/tenant';
import { AlertCircle, CheckCircle2, WifiOff } from 'lucide-react';
import { FormEvent, useId, useState } from 'react';
import { Link } from 'react-router-dom';

type FormStatus =
  'empty' | 'validation' | 'loading' | 'denied' | 'conflict' | 'failure' | 'success';

function statusCopy(status: FormStatus): { icon: typeof AlertCircle; text: string } | null {
  switch (status) {
    case 'validation':
      return {
        icon: AlertCircle,
        text: 'Enter the pharmacy name, owner email, phone, and an eight-character password.',
      };
    case 'denied':
      return {
        icon: AlertCircle,
        text: 'This counter cannot open a new pharmacy from here. Ask the owner.',
      };
    case 'conflict':
      return {
        icon: AlertCircle,
        text: 'That owner email is already on a pharmacy. Sign in or reset the password instead.',
      };
    case 'failure':
      return {
        icon: WifiOff,
        text: 'Could not reach the server. Try registering this pharmacy from the counter again.',
      };
    case 'success':
      return {
        icon: CheckCircle2,
        text: 'Check the owner email for a verification link before signing in at this counter.',
      };
    default:
      return null;
  }
}

export default function RegisterScreen() {
  const statusId = useId();
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<FormStatus>('empty');
  const banner = statusCopy(status);
  const done = status === 'success';

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!businessName.trim() || !email.trim() || !phone.trim() || password.trim().length < 8) {
      setStatus('validation');
      return;
    }
    setStatus('loading');
    try {
      await registerPharmacy({
        businessName: businessName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
      });
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
              <h1 className="text-xl font-semibold text-ink">Register this pharmacy</h1>
              <p className="mt-1 text-sm text-muted">
                Open a counter account. Verify the owner email before KYC unlocks the floor.
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
              <Label htmlFor="businessName">Pharmacy name</Label>
              <Input
                id="businessName"
                name="businessName"
                autoComplete="organization"
                value={businessName}
                onChange={(event) => setBusinessName(event.target.value)}
                disabled={done || status === 'loading'}
                aria-invalid={status === 'validation'}
                aria-describedby={banner ? statusId : undefined}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Owner email</Label>
              <Input
                id="email"
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={done || status === 'loading'}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                name="phone"
                autoComplete="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                disabled={done || status === 'loading'}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                name="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={done || status === 'loading'}
              />
            </div>
            <Button type="submit" className="w-full" disabled={done || status === 'loading'}>
              {status === 'loading' ? 'Opening pharmacy' : 'Register pharmacy'}
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
