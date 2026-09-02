import { Button, Input, Label } from '@atoms';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@molecules';
import { adminResetPassword, ApiError, isApiError } from '@/services/auth';
import type { StaffAccount } from '@/services/staff';
import { FormEvent, useEffect, useId, useRef, useState } from 'react';

type DialogStatus =
  'empty' | 'validation' | 'loading' | 'denied' | 'conflict' | 'failure' | 'success';

interface TillPasswordDialogProps {
  staff: StaffAccount;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (message: string) => void;
}

export function TillPasswordDialog({
  staff,
  open,
  onOpenChange,
  onSuccess,
}: TillPasswordDialogProps) {
  const statusId = useId();
  const passwordId = useId();
  const restoreRef = useRef<HTMLElement | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<DialogStatus>('empty');

  useEffect(() => {
    if (open) {
      restoreRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setPassword('');
      setConfirm('');
      setStatus('empty');
    } else {
      restoreRef.current?.focus();
    }
  }, [open]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (password.length < 8 || password !== confirm) {
      setStatus('validation');
      return;
    }
    setStatus('loading');
    try {
      await adminResetPassword(staff.email, password);
      setStatus('success');
      onSuccess('Temporary password saved. They must change it at next sign-in.');
      onOpenChange(false);
    } catch (error) {
      if (isApiError(error) || error instanceof ApiError) {
        if (error.status === 401 || error.status === 403 || error.status === 404) {
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

  const message =
    status === 'validation'
      ? 'Enter a temporary password of at least eight characters, twice.'
      : status === 'denied'
        ? 'Only the owner who created this account can reset the password.'
        : status === 'conflict'
          ? 'That password was used recently. Choose a different password.'
          : status === 'failure'
            ? 'Could not save the password. Try again.'
            : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogTitle>Reset password</DialogTitle>
        <DialogDescription>
          Set a temporary password for {staff.displayName}. They must change it at next sign-in.
        </DialogDescription>
        <p className="mt-2 font-mono text-sm text-ink">{staff.email}</p>
        {message ? (
          <p id={statusId} role="alert" className="mt-3 text-sm text-ink">
            {message}
          </p>
        ) : null}
        <form onSubmit={onSubmit} className="mt-4 space-y-3" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor={passwordId}>Temporary password</Label>
            <Input
              id={passwordId}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={status === 'validation'}
              aria-describedby={message ? statusId : undefined}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="till-confirm">Confirm password</Label>
            <Input
              id="till-confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={status === 'loading'}>
              {status === 'loading' ? 'Saving password' : 'Save password'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
