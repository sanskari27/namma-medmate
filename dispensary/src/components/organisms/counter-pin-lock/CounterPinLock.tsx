import { FormEvent, useEffect, useId, useRef, useState } from 'react';
import { AlertCircle, Delete, WifiOff } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { Button } from '@atoms';
import { ApiError, isApiError, unlockPin } from '@/services/auth';

type FormStatus =
  'empty' | 'validation' | 'loading' | 'denied' | 'conflict' | 'failure' | 'success';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back'] as const;

function statusCopy(status: FormStatus): { icon: typeof AlertCircle; text: string } | null {
  switch (status) {
    case 'validation':
      return { icon: AlertCircle, text: 'Enter all six digits before unlocking this counter.' };
    case 'denied':
      return { icon: AlertCircle, text: 'That PIN does not match this till. Try again.' };
    case 'conflict':
      return { icon: AlertCircle, text: 'This counter session is out of date. Sign in again.' };
    case 'failure':
      return { icon: WifiOff, text: 'Could not reach the server. Stay at this till and retry.' };
    default:
      return null;
  }
}

export function CounterPinLock({
  staffName,
  onUnlocked,
  onSessionRevoked,
}: {
  staffName: string;
  onUnlocked: () => void;
  onSessionRevoked: () => void;
}) {
  const reduce = useReducedMotion();
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
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
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
      await unlockPin(value);
      setStatus('success');
      onUnlocked();
    } catch (error) {
      if (isApiError(error) || error instanceof ApiError) {
        if (error.code === 'SESSION_REVOKED' || error.code === 'UNAUTHORIZED') {
          onSessionRevoked();
          return;
        }
        if (error.status === 409) {
          setStatus('conflict');
          return;
        }
        if (error.status === 401 || error.status === 403) {
          setStatus('denied');
          setPinValue('');
          return;
        }
      }
      setStatus('failure');
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void submit(pin);
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="counter-pin-lock-title"
      className="fixed inset-0 z-[70] flex bg-ink text-surface"
    >
      <div className="w-1 bg-brand" aria-hidden="true" />
      <motion.form
        onSubmit={onSubmit}
        className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-10"
        initial={reduce ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        noValidate
      >
        <div className="text-center">
          <p className="font-serif text-2xl font-semibold text-brand-soft">MedMate</p>
          <h2 id="counter-pin-lock-title" className="mt-3 text-2xl font-semibold">
            Counter locked
          </h2>
          <p className="mt-1 text-sm text-brand-soft">
            Till paused for {staffName.trim()}. Enter the six-digit PIN to resume this counter.
          </p>
        </div>
        <label htmlFor={pinId} className="sr-only">
          Counter PIN
        </label>
        <input
          id={pinId}
          name="unlockPin"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={6}
          value={pin}
          onChange={(event) => setPinValue(event.target.value.replace(/\D/g, '').slice(0, 6))}
          aria-invalid={status === 'validation' || status === 'denied'}
          aria-describedby={banner ? statusId : 'counter-pin-progress'}
          className="sr-only"
        />
        <div className="flex flex-col items-center gap-2">
          <div className="flex gap-2" aria-hidden="true">
            {Array.from({ length: 6 }, (_, index) => (
              <span
                key={index}
                className={`size-3 rounded-full border border-brand-soft ${
                  index < pin.length ? 'bg-brand-soft' : 'bg-transparent'
                }`}
              />
            ))}
          </div>
          <p id="counter-pin-progress" className="font-mono text-xs text-brand-soft">
            {pin.length} of 6 digits
          </p>
        </div>
        {banner ? (
          <p
            id={statusId}
            role="alert"
            className="flex max-w-sm items-start gap-2 border border-line bg-ink px-3 py-2 text-sm"
          >
            <banner.icon className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />
            <span>{banner.text}</span>
          </p>
        ) : null}
        <div className="grid w-full max-w-[18rem] grid-cols-3 gap-2">
          {KEYS.map((key) => (
            <button
              key={key}
              type="button"
              className="grid h-14 place-items-center border border-line bg-ink text-lg font-medium text-surface hover:bg-brand/40"
              aria-label={
                key === 'back'
                  ? 'Delete last digit'
                  : key === 'clear'
                    ? 'Clear PIN'
                    : `Digit ${key}`
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
        <Button type="submit" className="w-full max-w-[18rem]" disabled={status === 'loading'}>
          {status === 'loading' ? 'Unlocking' : 'Unlock this counter'}
        </Button>
      </motion.form>
    </div>
  );
}
