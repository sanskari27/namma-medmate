import { FormEvent, useId, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, Lock, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CounterFeatureSlider, CounterFeatureStrip } from '@/components/auth/CounterFeatureSlider';
import { Reveal } from '@/components/Reveal';
import { ROUTES } from '@/libs/constants/routes.const';
import { ApiError, isApiError, loginWithPassword } from '@/services/auth';
import { sessionStarted } from '@/store';

const PHARMACY_ROLES = new Set(['pharmacy_owner', 'pharmacy_staff']);

type FormStatus = 'empty' | 'validation' | 'loading' | 'denied' | 'locked' | 'conflict' | 'failure' | null;

function statusCopy(status: FormStatus): { icon: typeof AlertCircle; text: string } | null {
  switch (status) {
    case 'validation':
      return {
        icon: AlertCircle,
        text: 'Enter the email and password for this counter.',
      };
    case 'denied':
      return {
        icon: AlertCircle,
        text: 'Email or password does not match this counter login. Check the email on this branch login.',
      };
    case 'locked':
      return {
        icon: Lock,
        text: 'This staff account cannot enter the dispensary. Ask the owner.',
      };
    case 'conflict':
      return {
        icon: AlertCircle,
        text: 'This counter session is out of date. Sign in again.',
      };
    case 'failure':
      return {
        icon: WifiOff,
        text: 'Could not reach the server. Try again from this counter.',
      };
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
      if (!PHARMACY_ROLES.has(user.role)) {
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
    <div className="grid min-h-screen bg-canvas md:grid-cols-[minmax(0,1fr)_28rem]">
      <CounterFeatureSlider />
      <section className="flex min-h-screen flex-col border-l-4 border-brand bg-surface">
        <CounterFeatureStrip />
        <Reveal className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-12">
          <p className="mb-8 font-serif text-2xl font-semibold text-brand md:hidden">MedMate</p>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div>
              <h1 className="text-xl font-semibold text-ink">Pharmacy sign in</h1>
              <p className="mt-1 text-sm text-muted">Use the email issued for this counter. PIN lock comes after you are in.</p>
            </div>
            {banner ? (
              <p
                id={statusId}
                role="alert"
                className="flex items-start gap-2 border border-line bg-canvas px-3 py-2 text-sm text-ink"
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
              {status === 'loading' ? 'Signing in' : 'Sign in'}
            </Button>
            <p className="text-sm text-muted">
              <Link to={ROUTES.FORGOT_PASSWORD} className="text-brand underline-offset-2 hover:underline">
                Forgot the owner password?
              </Link>
              <span className="block pt-1">Staff passwords are reset by the owner at the counter.</span>
            </p>
          </form>
        </Reveal>
      </section>
    </div>
  );
}
