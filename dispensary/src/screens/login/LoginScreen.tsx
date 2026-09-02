import { FormEvent, useEffect, useId, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, UserRound, WifiOff } from 'lucide-react';
import { CounterPinSignIn } from '@/screens/login/components/counter-pin-sign-in';
import { CounterFeatureSlider, CounterFeatureStrip } from '@molecules';
import { Reveal, Button, Input, Label } from '@atoms';
import { ROUTES } from '@/libs/constants/routes.const';
import {
  ApiError,
  forgetSavedLogin,
  isApiError,
  listSavedLogins,
  loginWithPassword,
  type SavedLoginPerson,
} from '@/services/auth';
import { sessionStarted, type AuthUser } from '@/store';
import { PHARMACY_ROLES, statusCopy, tillRole, type FormStatus } from './LoginScreen.utils';

export default function LoginScreen() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const statusId = useId();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [revealPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<FormStatus>('empty');
  const [people, setPeople] = useState<SavedLoginPerson[] | null>(null);
  const [listFailed, setListFailed] = useState(false);
  const [passwordMode, setPasswordMode] = useState(false);
  const [selected, setSelected] = useState<SavedLoginPerson | null>(null);

  const banner = statusCopy(status);

  const loadPeople = async () => {
    try {
      const items = await listSavedLogins();
      setPeople(items);
      setListFailed(false);
      if (items.length === 0) {
        setPasswordMode(true);
      }
    } catch {
      setPeople([]);
      setListFailed(true);
      setPasswordMode(true);
    }
  };

  useEffect(() => {
    void loadPeople();
  }, []);

  const finishSignIn = (user: AuthUser) => {
    if (!PHARMACY_ROLES.has(user.role)) {
      setStatus('denied');
      setSelected(null);
      setPasswordMode(true);
      return;
    }
    dispatch(sessionStarted(user));
    navigate(ROUTES.DASHBOARD);
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password) {
      setStatus('validation');
      return;
    }
    setStatus('loading');
    try {
      const user = await loginWithPassword(email, password);
      finishSignIn(user);
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

  const onForget = async (person: SavedLoginPerson) => {
    try {
      await forgetSavedLogin(person.userId);
      const next = (people ?? []).filter((item) => item.userId !== person.userId);
      setPeople(next);
      if (next.length === 0) {
        setPasswordMode(true);
      }
    } catch {
      setStatus('failure');
    }
  };

  const showPicker = people !== null && people.length > 0 && !passwordMode && !selected;
  const showPin = selected !== null;
  const showPassword = people !== null && (passwordMode || people.length === 0) && !selected;

  return (
    <div className="grid min-h-screen bg-canvas md:grid-cols-[minmax(0,1fr)_28rem]">
      <CounterFeatureSlider />
      <section className="flex min-h-screen flex-col border-l-4 border-brand bg-surface">
        <CounterFeatureStrip />
        <Reveal className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-12">
          <p className="mb-8 font-serif text-2xl font-semibold text-brand md:hidden">MedMate</p>
          {people === null ? <p className="text-sm text-muted">Loading till logins</p> : null}
          {showPicker ? (
            <div className="space-y-4">
              <div>
                <h1 className="text-xl font-semibold text-ink">Who is at this counter?</h1>
                <p className="mt-1 text-sm text-muted">
                  Tap a saved person and enter their PIN. Faster than typing email.
                </p>
              </div>
              <ul className="space-y-2">
                {people.map((person) => (
                  <li key={person.userId} className="flex items-stretch gap-2">
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-3 border border-line bg-canvas px-3 py-3 text-left hover:bg-brand-soft"
                      aria-label={`Sign in as ${person.displayName}`}
                      onClick={() => setSelected(person)}
                    >
                      <UserRound className="size-5 shrink-0 text-brand" aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-ink">
                          {person.displayName}
                        </span>
                        <span className="block truncate font-mono text-xs text-muted">
                          {tillRole(person.role)} · {person.email}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      className="border border-line px-2 text-xs text-muted hover:text-ink"
                      aria-label={`Forget ${person.displayName} on this till`}
                      onClick={() => void onForget(person)}
                    >
                      Forget
                    </button>
                  </li>
                ))}
              </ul>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setPasswordMode(true)}
              >
                Add another counter login
              </Button>
            </div>
          ) : null}
          {showPin && selected ? (
            <CounterPinSignIn
              person={selected}
              onSignedIn={finishSignIn}
              onBack={() => setSelected(null)}
            />
          ) : null}
          {showPassword ? (
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <div>
                <h1 className="text-xl font-semibold text-ink">Pharmacy sign in</h1>
                <p className="mt-1 text-sm text-muted">
                  Use the email issued for this counter. After a PIN, this till can remember you.
                </p>
              </div>
              {listFailed ? (
                <p
                  role="alert"
                  className="flex items-start gap-2 border border-line bg-canvas px-3 py-2 text-sm text-ink"
                >
                  <WifiOff className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />
                  <span>Could not load saved till logins. Use email and password.</span>
                </p>
              ) : null}
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
                    type={revealPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted hover:text-ink"
                    aria-label={revealPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((value) => !value)}
                  >
                    {revealPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={status === 'loading'}>
                {status === 'loading' ? 'Signing in' : 'Sign in'}
              </Button>
              {people.length > 0 ? (
                <button
                  type="button"
                  className="text-sm text-brand underline-offset-2 hover:underline"
                  onClick={() => {
                    setPasswordMode(false);
                    setStatus('empty');
                  }}
                >
                  Back to saved till logins
                </button>
              ) : null}
              <p className="text-sm text-muted">
                <Link
                  to={ROUTES.FORGOT_PASSWORD}
                  className="text-brand underline-offset-2 hover:underline"
                >
                  Forgot the owner password?
                </Link>
                <span className="block pt-1">
                  Staff passwords are reset by the owner at the counter.
                </span>
              </p>
            </form>
          ) : null}
        </Reveal>
      </section>
    </div>
  );
}
