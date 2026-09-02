import { FormEvent, useEffect, useId, useRef, useState } from 'react';
import { ShieldAlert, Unplug } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { Button } from '@atoms';
import { ApiError, isApiError, unlockPin } from '@/services/auth';

type FormStatus =
  'empty' | 'validation' | 'loading' | 'denied' | 'conflict' | 'failure' | 'success';

function statusCopy(status: FormStatus): { icon: typeof ShieldAlert; text: string } | null {
  switch (status) {
    case 'validation':
      return { icon: ShieldAlert, text: 'Enter all six HQ PIN digits.' };
    case 'denied':
      return { icon: ShieldAlert, text: 'Operator PIN was not recognised.' };
    case 'conflict':
      return { icon: ShieldAlert, text: 'This HQ session is stale. Sign in again.' };
    case 'failure':
      return { icon: Unplug, text: 'The platform API did not respond. Retry from this console.' };
    default:
      return null;
  }
}

export function HqSessionLock({
  operatorName,
  onUnlocked,
  onSessionRevoked,
}: {
  operatorName: string;
  onUnlocked: () => void;
  onSessionRevoked: () => void;
}) {
  const reduce = useReducedMotion();
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

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!/^[0-9]{6}$/.test(pin)) {
      setStatus('validation');
      return;
    }
    setStatus('loading');
    try {
      await unlockPin(pin);
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="hq-pin-lock-title"
      className="fixed inset-0 z-[70] grid place-items-center bg-canvas/92 p-4"
    >
      <motion.form
        onSubmit={onSubmit}
        className="w-full max-w-md border border-line bg-elevated p-6"
        initial={reduce ? false : { opacity: 0, x: 18 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        noValidate
      >
        <p className="font-serif text-lg font-semibold">MedMate HQ</p>
        <p className="font-mono text-[11px] text-muted">{operatorName}</p>
        <h2 id="hq-pin-lock-title" className="mt-4 text-lg font-medium">
          HQ session locked
        </h2>
        <p className="mt-1 mb-5 text-sm text-muted">
          This console is idle. Enter the operator PIN to resume the same HQ session.
        </p>
        {banner ? (
          <p
            id={statusId}
            role="alert"
            className="mb-4 flex items-start gap-2 border border-line bg-surface px-3 py-2 text-sm"
          >
            <banner.icon className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />
            <span>{banner.text}</span>
          </p>
        ) : null}
        <label htmlFor={pinId} className="mb-2 block text-sm">
          Operator PIN
        </label>
        <div
          data-testid="hq-pin-cells"
          className="relative mb-4 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus"
          onClick={() => inputRef.current?.focus()}
        >
          <input
            ref={inputRef}
            id={pinId}
            name="unlockPin"
            inputMode="numeric"
            autoComplete="off"
            maxLength={6}
            value={pin}
            onChange={(event) => setPinValue(event.target.value.replace(/\D/g, '').slice(0, 6))}
            aria-invalid={status === 'validation' || status === 'denied'}
            aria-describedby={banner ? statusId : 'hq-pin-cells-visual'}
            className="absolute inset-0 z-10 cursor-text opacity-0"
          />
          <div id="hq-pin-cells-visual" className="flex gap-2" aria-hidden="true">
            {Array.from({ length: 6 }, (_, index) => (
              <span
                key={index}
                className="grid h-11 w-10 place-items-center border border-line bg-surface font-mono text-lg"
              >
                {pin[index] ? '•' : ''}
              </span>
            ))}
          </div>
        </div>
        <p className="mb-4 font-mono text-[11px] text-muted">{pin.length} / 6 digits</p>
        <Button type="submit" className="w-full" disabled={status === 'loading'}>
          {status === 'loading' ? 'Resuming' : 'Resume session'}
        </Button>
      </motion.form>
    </div>
  );
}
