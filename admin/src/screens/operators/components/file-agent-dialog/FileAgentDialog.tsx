import { Button, Input, Label } from '@atoms';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@molecules';
import { ApiError, isApiError } from '@/services/axios';
import { createOperator } from '@/services/staff';
import { FormEvent, useEffect, useId, useRef, useState } from 'react';

type DialogStatus = 'empty' | 'validation' | 'loading' | 'denied' | 'conflict' | 'failure';

interface FileAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (message: string) => void;
}

export function FileAgentDialog({ open, onOpenChange, onSuccess }: FileAgentDialogProps) {
  const statusId = useId();
  const restoreRef = useRef<HTMLElement | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<DialogStatus>('empty');

  useEffect(() => {
    if (open) {
      restoreRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setName('');
      setPhone('');
      setEmail('');
      setPassword('');
      setStatus('empty');
    } else {
      restoreRef.current?.focus();
    }
  }, [open]);

  const message =
    status === 'validation'
      ? 'Enter name, phone, email, and a password of at least eight characters.'
      : status === 'denied'
        ? 'Only the HQ administrator can add verification agents.'
        : status === 'conflict'
          ? 'That email is already in use.'
          : status === 'failure'
            ? 'Could not save this operator. Try again.'
            : null;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !phone.trim() || !email.trim() || password.length < 8) {
      setStatus('validation');
      return;
    }
    setStatus('loading');
    try {
      await createOperator({
        displayName: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        password,
      });
      onSuccess(
        'Verification agent saved. Approve them under Staff approvals before they can sign in.',
      );
      onOpenChange(false);
    } catch (error) {
      if (isApiError(error) || error instanceof ApiError) {
        if (error.status === 409) {
          setStatus('conflict');
          return;
        }
        if (error.status === 403) {
          setStatus('denied');
          return;
        }
      }
      setStatus('failure');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogTitle>Add verification agent</DialogTitle>
        <DialogDescription>
          This agent can later approve pharmacy staff. They cannot sign in until you approve them
          under Staff approvals.
        </DialogDescription>
        {message ? (
          <p id={statusId} role="alert" className="mt-3 text-sm text-ink">
            {message}
          </p>
        ) : null}
        <form onSubmit={onSubmit} className="mt-4 space-y-3" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="op-name">Name</Label>
            <Input id="op-name" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="op-phone">Phone</Label>
            <Input id="op-phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="op-email">Email</Label>
            <Input
              id="op-email"
              type="email"
              autoComplete="off"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="op-secret">Temporary password</Label>
            <Input
              id="op-secret"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={status === 'loading'}>
              {status === 'loading' ? 'Saving' : 'Save agent'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
