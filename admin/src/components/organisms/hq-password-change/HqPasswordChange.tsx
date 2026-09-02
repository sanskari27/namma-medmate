import { FormEvent, useEffect, useId, useRef, useState } from 'react';
import { ShieldAlert, Unplug } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { Button, Input, Label } from '@atoms';
import { ApiError, changePassword, isApiError } from '@/services/auth';

type FormStatus =
  'empty' | 'validation' | 'loading' | 'denied' | 'conflict' | 'failure' | 'success';

function statusCopy(status: FormStatus): { icon: typeof ShieldAlert; text: string } | null {
  switch (status) {
    case 'validation':
      return {
        icon: ShieldAlert,
        text: 'Enter the current HQ password and a new secret of at least eight characters.',
      };
    case 'denied':
      return { icon: ShieldAlert, text: 'Current HQ password was not recognised.' };
    case 'conflict':
      return {
        icon: ShieldAlert,
        text: 'That secret is already in this operator history. Choose another.',
      };
    case 'failure':
      return {
        icon: Unplug,
        text: 'The platform API did not save the password. Retry from this console.',
      };
    default:
      return null;
  }
}

export function HqPasswordChange({ onChanged }: { onChanged: () => void }) {
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
      aria-labelledby="hq-password-title"
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
        <h2 id="hq-password-title" className="mt-3 text-lg font-medium text-ink">
          Rotate HQ password
        </h2>
        <p className="mt-1 mb-5 text-sm text-muted">
          This operator password expired or was issued as a temporary secret. Set a new one before
          using the console.
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
            <Label htmlFor={currentId}>Current HQ password</Label>
            <Input
              id={currentId}
              type="password"
              autoComplete="current-password"
              className="font-mono"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              aria-invalid={status === 'validation'}
              aria-describedby={banner ? statusId : undefined}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-password">New HQ password</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              className="font-mono"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Confirm HQ password</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              className="font-mono"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={status === 'loading'}>
            {status === 'loading' ? 'Saving HQ password' : 'Save HQ password'}
          </Button>
        </div>
      </motion.form>
    </div>
  );
}
