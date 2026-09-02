import { FormEvent, useEffect, useId, useRef, useState } from 'react';
import { AlertCircle, WifiOff } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError, isApiError, setPin } from '@/services/auth';

type FormStatus = 'empty' | 'validation' | 'loading' | 'denied' | 'conflict' | 'failure' | 'success';

function statusCopy(status: FormStatus): { icon: typeof AlertCircle; text: string } | null {
  switch (status) {
    case 'validation':
      return { icon: AlertCircle, text: 'Enter the same six-digit PIN twice for this till.' };
    case 'denied':
      return { icon: AlertCircle, text: 'This counter session expired. Sign in again, then set the PIN.' };
    case 'conflict':
      return { icon: AlertCircle, text: 'This counter already has a PIN. Wait for lock, then unlock with it.' };
    case 'failure':
      return { icon: WifiOff, text: 'Could not reach the server. Try saving the PIN from this counter.' };
    default:
      return null;
  }
}

export function CounterPinEnroll({ onEnrolled }: { onEnrolled: () => void }) {
  const reduce = useReducedMotion();
  const statusId = useId();
  const pinId = useId();
  const confirmId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const [pin, setPinValue] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<FormStatus>('empty');
  const banner = statusCopy(status);

  useEffect(() => {
    restoreRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
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
    if (!/^[0-9]{6}$/.test(pin) || pin !== confirm) {
      setStatus('validation');
      return;
    }
    setStatus('loading');
    try {
      const user = await setPin(pin);
      if (!user.pinSet) {
        setStatus('failure');
        return;
      }
      setStatus('success');
      onEnrolled();
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
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="counter-pin-enroll-title"
      className="fixed inset-0 z-[70] flex bg-canvas"
    >
      <div className="hidden w-1 bg-brand md:block" aria-hidden="true" />
      <motion.div
        className="flex flex-1 items-center justify-center p-6"
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      >
        <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 border border-line bg-surface p-6" noValidate>
          <div>
            <p className="font-serif text-lg font-semibold text-brand">MedMate</p>
            <h2 id="counter-pin-enroll-title" className="mt-2 text-xl font-semibold text-ink">
              Set a counter PIN
            </h2>
            <p className="mt-1 text-sm text-muted">
              After five quiet minutes this till locks. Choose six digits you can type at the counter.
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
          <div className="space-y-1.5">
            <Label htmlFor={pinId}>Counter PIN</Label>
            <Input
              id={pinId}
              name="pin"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={6}
              value={pin}
              onChange={(event) => setPinValue(event.target.value.replace(/\D/g, '').slice(0, 6))}
              aria-invalid={status === 'validation'}
              aria-describedby={banner ? statusId : undefined}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={confirmId}>Repeat PIN</Label>
            <Input
              id={confirmId}
              name="confirmPin"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={6}
              value={confirm}
              onChange={(event) => setConfirm(event.target.value.replace(/\D/g, '').slice(0, 6))}
              aria-invalid={status === 'validation'}
            />
          </div>
          <Button type="submit" className="w-full" disabled={status === 'loading'}>
            {status === 'loading' ? 'Saving PIN' : 'Save PIN'}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
