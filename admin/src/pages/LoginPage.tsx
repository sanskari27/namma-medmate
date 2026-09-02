import { FormEvent, useId, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { Ban, Eye, EyeOff, ShieldAlert, Unplug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HqFeatureSlider, HqStatusTicker } from '@/components/auth/HqFeatureSlider';
import { Reveal } from '@/components/Reveal';
import { ROUTES } from '@/libs/constants/routes.const';
import { ApiError, isApiError, loginWithPassword } from '@/services/auth';
import { sessionStarted } from '@/store';

type FormStatus = 'empty' | 'validation' | 'loading' | 'denied' | 'locked' | 'conflict' | 'failure' | null;

function statusCopy(status: FormStatus): { icon: typeof Ban; text: string } | null {
  switch (status) {
    case 'validation':
      return { icon: ShieldAlert, text: 'Enter HQ email and password.' };
    case 'denied':
      return { icon: Ban, text: 'HQ credentials were not recognised.' };
    case 'locked':
      return { icon: ShieldAlert, text: 'This operator account cannot enter HQ.' };
    case 'conflict':
      return { icon: ShieldAlert, text: 'This HQ session is stale. Sign in again.' };
    case 'failure':
      return { icon: Unplug, text: 'The platform API did not respond. Retry from this console.' };
    default:
      return null;
  }
}

export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const statusId = useId();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<FormStatus>('empty');
  const banner = statusCopy(status);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password) {
      setStatus('validation');
      return;
    }
    setStatus('loading');
    try {
      const user = await loginWithPassword(email, password);
      if (user.role !== 'admin_super') {
        setStatus('denied');
        return;
      }
      dispatch(sessionStarted(user));
      navigate(ROUTES.DASHBOARD);
    } catch (error) {
      if (isApiError(error) || error instanceof ApiError) {
        if (error.status === 401) {
          setStatus('denied');
          return;
        }
        if (error.status === 403) {
          setStatus('locked');
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
    <div className="flex min-h-screen bg-canvas text-ink">
      <section className="flex w-full max-w-md flex-col border-r border-line bg-surface">
        <HqStatusTicker />
        <Reveal className="flex flex-1 flex-col justify-center px-8 py-12 sm:px-10">
          <p className="font-serif text-2xl font-semibold">MedMate HQ</p>
          <p className="mt-1 mb-8 text-sm text-muted">Platform operators only</p>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div>
              <h1 className="text-lg font-medium text-ink">HQ sign in</h1>
              <p className="mt-1 text-sm text-muted">Authenticate the MASTER session for this console.</p>
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
              <Label htmlFor="email">Email</Label>
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
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted hover:text-ink"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={status === 'loading'}>
              {status === 'loading' ? 'Authenticating' : 'Sign in'}
            </Button>
            <p className="text-sm text-muted">
              <Link to={ROUTES.FORGOT_PASSWORD} className="text-brand underline-offset-2 hover:underline">
                Forgot the HQ password?
              </Link>
              <span className="mt-1 block font-mono text-[11px] text-muted">
                Sub-account secrets are reset by the creating MASTER operator.
              </span>
            </p>
          </form>
        </Reveal>
      </section>
      <HqFeatureSlider />
    </div>
  );
}
