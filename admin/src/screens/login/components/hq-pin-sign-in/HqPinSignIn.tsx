import { FormEvent, useEffect, useId, useRef, useState } from 'react';
import { ShieldAlert, Unplug } from 'lucide-react';
import { Button } from '@atoms';
import { ApiError, isApiError, pinLogin, type SavedLoginPerson } from '@/services/auth';
import type { AuthUser } from '@/store';

type FormStatus = 'empty' | 'validation' | 'loading' | 'denied' | 'locked' | 'conflict' | 'failure';

function statusCopy(status: FormStatus): { icon: typeof ShieldAlert; text: string } | null {
  switch (status) {
    case 'validation':
      return { icon: ShieldAlert, text: 'Enter all six HQ PIN digits.' };
    case 'denied':
      return { icon: ShieldAlert, text: 'Operator PIN was not recognised.' };
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

export function HqPinSignIn({
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
  const inputRef = useRef<HTMLInputElement | null>(null);
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

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!/^[0-9]{6}$/.test(pin)) {
      setStatus('validation');
      return;
    }
    setStatus('loading');
    try {
      const user = await pinLogin(person.userId, pin);
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

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div>
        <h1 className="text-lg font-medium text-ink">Authenticate {person.displayName}</h1>
        <p className="mt-1 font-mono text-[11px] text-muted">{person.email}</p>
        <p className="mt-2 text-sm text-muted">Enter the operator PIN saved on this console.</p>
      </div>
      {banner ? (
        <p
          id={statusId}
          role="alert"
          className="flex items-start gap-2 border border-line bg-elevated px-3 py-2 text-sm"
        >
          <banner.icon className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />
          <span>{banner.text}</span>
        </p>
      ) : null}
      <label htmlFor={pinId} className="block text-sm">
        Operator PIN
      </label>
      <div
        data-testid="hq-pin-signin-cells"
        className="relative focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus"
        onClick={() => inputRef.current?.focus()}
      >
        <input
          ref={inputRef}
          id={pinId}
          name="signInPin"
          inputMode="numeric"
          autoComplete="off"
          maxLength={6}
          value={pin}
          onChange={(event) => setPinValue(event.target.value.replace(/\D/g, '').slice(0, 6))}
          aria-invalid={status === 'validation' || status === 'denied'}
          aria-describedby={banner ? statusId : 'hq-pin-signin-visual'}
          className="absolute inset-0 z-10 cursor-text opacity-0"
        />
        <div id="hq-pin-signin-visual" className="flex gap-2" aria-hidden="true">
          {Array.from({ length: 6 }, (_, index) => (
            <span
              key={index}
              className="grid h-11 w-10 place-items-center border border-line bg-elevated font-mono text-lg"
            >
              {pin[index] ? '•' : ''}
            </span>
          ))}
        </div>
      </div>
      <p className="font-mono text-[11px] text-muted">{pin.length} / 6 digits</p>
      <Button type="submit" className="w-full" disabled={status === 'loading'}>
        {status === 'loading' ? 'Authenticating' : 'Authenticate with PIN'}
      </Button>
      <button
        type="button"
        className="text-sm text-brand underline-offset-2 hover:underline"
        onClick={onBack}
      >
        Back to saved HQ logins
      </button>
    </form>
  );
}
