import { FormEvent, useEffect, useId, useRef, useState } from 'react';
import { ShieldAlert, Unplug } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError, isApiError, setPin } from '@/services/auth';

type FormStatus = 'empty' | 'validation' | 'loading' | 'denied' | 'conflict' | 'failure' | 'success';

function statusCopy(status: FormStatus): { icon: typeof ShieldAlert; text: string } | null {
  switch (status) {
    case 'validation':
      return { icon: ShieldAlert, text: 'Enter the same six-digit HQ PIN twice.' };
    case 'denied':
      return { icon: ShieldAlert, text: 'This HQ session is no longer valid. Authenticate again, then set the PIN.' };
    case 'conflict':
      return { icon: ShieldAlert, text: 'An HQ PIN is already on this operator.' };
    case 'failure':
      return { icon: Unplug, text: 'The platform API did not save the PIN. Retry from this console.' };
    default:
      return null;
  }
}

export function HqPinEnroll({ onEnrolled }: { onEnrolled: () => void }) {
  const reduce = useReducedMotion();
  const statusId = useId();
  const pinId = useId();
  const confirmId = useId();
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
      role="dialog"
      aria-modal="true"
      aria-labelledby="hq-pin-enroll-title"
      className="fixed inset-0 z-[70] grid place-items-center bg-canvas/90 p-4"
    >
      <motion.form
        onSubmit={onSubmit}
        className="w-full max-w-md border border-line bg-surface p-6"
        initial={reduce ? false : { opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        noValidate
      >
        <p className="font-serif text-lg font-semibold">MedMate HQ</p>
        <h2 id="hq-pin-enroll-title" className="mt-3 text-lg font-medium text-ink">
          Set HQ PIN
        </h2>
        <p className="mt-1 mb-5 text-sm text-muted">
          Idle HQ consoles lock after five minutes. Choose six digits for this operator.
        </p>
        {banner ? (
          <p
            id={statusId}
            role="alert"
            className="mb-4 flex items-start gap-2 border border-line bg-elevated px-3 py-2 text-sm"
          >
            <banner.icon className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />
            <span>{banner.text}</span>
          </p>
        ) : null}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor={pinId}>HQ PIN</Label>
            <Input
              id={pinId}
              name="pin"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={6}
              className="font-mono tracking-[0.4em]"
              value={pin}
              onChange={(event) => setPinValue(event.target.value.replace(/\D/g, '').slice(0, 6))}
              aria-invalid={status === 'validation'}
              aria-describedby={banner ? statusId : undefined}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={confirmId}>Confirm HQ PIN</Label>
            <Input
              id={confirmId}
              name="confirmPin"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={6}
              className="font-mono tracking-[0.4em]"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value.replace(/\D/g, '').slice(0, 6))}
              aria-invalid={status === 'validation'}
            />
          </div>
          <Button type="submit" className="w-full" disabled={status === 'loading'}>
            {status === 'loading' ? 'Saving HQ PIN' : 'Save HQ PIN'}
          </Button>
        </div>
      </motion.form>
    </div>
  );
}
