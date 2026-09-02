import { FormEvent, useEffect, useId, useRef, useState } from 'react';
import { AlertCircle, Delete, WifiOff } from 'lucide-react';
import { Button } from '@atoms';
import { ApiError, isApiError, pinLogin, type SavedLoginPerson } from '@/services/auth';
import type { AuthUser } from '@/store';

type FormStatus = 'empty' | 'validation' | 'loading' | 'denied' | 'locked' | 'conflict' | 'failure';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back'] as const;

function statusCopy(status: FormStatus): { icon: typeof AlertCircle; text: string } | null {
  switch (status) {
    case 'validation':
      return { icon: AlertCircle, text: 'Enter all six digits before signing in at this counter.' };
    case 'denied':
      return { icon: AlertCircle, text: 'That PIN does not match this till login. Try again.' };
    case 'locked':
      return {
        icon: AlertCircle,
        text: 'This staff account cannot enter the dispensary. Ask the owner.',
      };
    case 'conflict':
      return { icon: AlertCircle, text: 'This counter session is out of date. Sign in again.' };
    case 'failure':
      return { icon: WifiOff, text: 'Could not reach the server. Stay at this till and retry.' };
    default:
      return null;
  }
}

export function CounterPinSignIn({
  person,
  onSignedIn,
  onBack,
}: {
  person: SavedLoginPerson;
  onSignedIn: (user: AuthUser) => void;
  onBack: () => void;
}) {
  const statusId = useId();
  const pinId = useId();
  const restoreRef = useRef<HTMLElement | null>(null);
  const [pin, setPinValue] = useState('');
  const [status, setStatus] = useState<FormStatus>('empty');
  const banner = statusCopy(status);

  useEffect(() => {
    restoreRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.getElementById(pinId)?.focus();
    return () => {
      restoreRef.current?.focus();
    };
  }, [pinId]);

  const submit = async (value: string) => {
    if (!/^[0-9]{6}$/.test(value)) {
      setStatus('validation');
      return;
    }
    setStatus('loading');
    try {
      const user = await pinLogin(person.userId, value);
      onSignedIn(user);
    } catch (error) {
      if (isApiError(error) || error instanceof ApiError) {
        if (error.status === 409) {
          setStatus('conflict');
          return;
        }
        if (error.status === 403) {
          setStatus('locked');
          setPinValue('');
          return;
        }
        if (error.status === 401) {
          setStatus('denied');
          setPinValue('');
          return;
        }
      }
      setStatus('failure');
    }
  };

  const pressKey = (key: (typeof KEYS)[number]) => {
    if (status === 'loading') {
      return;
    }
    if (key === 'clear') {
      setPinValue('');
      return;
    }
    if (key === 'back') {
      setPinValue((current) => current.slice(0, -1));
      return;
    }
    setPinValue((current) => {
      const next = (current + key).slice(0, 6);
      if (next.length === 6) {
        window.setTimeout(() => {
          void submit(next);
        }, 0);
      }
      return next;
    });
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void submit(pin);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div>
        <h1 className="text-xl font-semibold text-ink">Sign in as {person.displayName}</h1>
        <p className="mt-1 text-sm text-muted">
          Enter the six-digit PIN for this counter. Not the password.
        </p>
      </div>
      <label htmlFor={pinId} className="sr-only">
        Counter PIN
      </label>
      <input
        id={pinId}
        name="signInPin"
        type="password"
        inputMode="numeric"
        autoComplete="off"
        maxLength={6}
        value={pin}
        onChange={(event) => setPinValue(event.target.value.replace(/\D/g, '').slice(0, 6))}
        aria-invalid={status === 'validation' || status === 'denied'}
        aria-describedby={banner ? statusId : 'counter-pin-sign-progress'}
        className="sr-only"
      />
      <div className="flex flex-col items-center gap-2">
        <div className="flex gap-2" aria-hidden="true">
          {Array.from({ length: 6 }, (_, index) => (
            <span
              key={index}
              className={`size-3 rounded-full border border-line ${
                index < pin.length ? 'bg-brand' : 'bg-transparent'
              }`}
            />
          ))}
        </div>
        <p id="counter-pin-sign-progress" className="font-mono text-xs text-muted">
          {pin.length} of 6 digits
        </p>
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
      <div className="grid w-full grid-cols-3 gap-2">
        {KEYS.map((key) => (
          <button
            key={key}
            type="button"
            className="grid h-14 place-items-center border border-line bg-surface text-lg font-medium text-ink hover:bg-brand-soft"
            aria-label={
              key === 'back' ? 'Delete last digit' : key === 'clear' ? 'Clear PIN' : `Digit ${key}`
            }
            onClick={() => pressKey(key)}
            disabled={status === 'loading'}
          >
            {key === 'back' ? (
              <Delete className="size-5" aria-hidden="true" />
            ) : key === 'clear' ? (
              'C'
            ) : (
              key
            )}
          </button>
        ))}
      </div>
      <Button type="submit" className="w-full" disabled={status === 'loading'}>
        {status === 'loading' ? 'Signing in' : 'Sign in to this counter'}
      </Button>
      <button
        type="button"
        className="text-sm text-brand underline-offset-2 hover:underline"
        onClick={onBack}
      >
        Back to saved till logins
      </button>
    </form>
  );
}
