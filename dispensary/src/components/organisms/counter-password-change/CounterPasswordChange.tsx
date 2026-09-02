import { FormEvent, useEffect, useId, useRef, useState } from 'react';
import { AlertCircle, WifiOff } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { Button, Input, Label } from '@atoms';
import { ApiError, changePassword, isApiError } from '@/services/auth';

type FormStatus =
  'empty' | 'validation' | 'loading' | 'denied' | 'conflict' | 'failure' | 'success';

function statusCopy(status: FormStatus): { icon: typeof AlertCircle; text: string } | null {
  switch (status) {
    case 'validation':
      return {
        icon: AlertCircle,
        text: 'Enter the current counter password and a new one with at least eight characters.',
      };
    case 'denied':
      return {
        icon: AlertCircle,
        text: 'Current password does not match this counter. Try again or ask the owner.',
      };
    case 'conflict':
      return {
        icon: AlertCircle,
        text: 'That password was used before on this till. Pick one this counter has not used.',
      };
    case 'failure':
      return {
        icon: WifiOff,
        text: 'Could not reach the server. Save the new password from this counter again.',
      };
    default:
      return null;
  }
}

export function CounterPasswordChange({ onChanged }: { onChanged: () => void }) {
  const reduce = useReducedMotion();
  const statusId = useId();
  const currentId = useId();
  const restoreRef = useRef<HTMLElement | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<FormStatus>('empty');
  const banner = statusCopy(status);

  useEffect(() => {
    restoreRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.getElementById(currentId)?.focus();
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
  }, [currentId]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!currentPassword || newPassword.length < 8 || newPassword !== confirm) {
      setStatus('validation');
      return;
    }
    setStatus('loading');
    try {
      await changePassword(currentPassword, newPassword);
      setStatus('success');
      onChanged();
    } catch (error) {
      if (isApiError(error) || error instanceof ApiError) {
        if (error.status === 401 || error.status === 403) {
          setStatus('denied');
          return;
        }
        if (error.status === 409 || (error.status === 422 && error.code === 'PASSWORD_REUSED')) {
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
      aria-labelledby="counter-password-title"
      className="fixed inset-0 z-50 flex bg-canvas"
    >
      <div className="hidden w-1.5 bg-brand md:block" aria-hidden />
      <motion.div
        className="flex flex-1 items-center justify-center px-6"
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24 }}
      >
        <form
          onSubmit={onSubmit}
          className="w-full max-w-sm space-y-4 border border-line bg-surface p-6"
          noValidate
        >
          <div>
            <h2 id="counter-password-title" className="text-lg font-semibold text-ink">
              Change this counter password
            </h2>
            <p className="mt-1 text-sm text-muted">
              The till password expired or was set by the owner. Set a new one before you bill.
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
            <Label htmlFor={currentId}>Current password</Label>
            <Input
              id={currentId}
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              aria-invalid={status === 'validation'}
              aria-describedby={banner ? statusId : undefined}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={status === 'loading'}>
            {status === 'loading' ? 'Saving password' : 'Save counter password'}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
