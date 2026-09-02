import { Button, Input, Label } from '@atoms';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@molecules';
import { ApiError, isApiError } from '@/services/axios';
import { createStaff } from '@/services/staff';
import { FormEvent, useEffect, useId, useRef, useState } from 'react';

type DialogStatus =
  | 'empty'
  | 'validation'
  | 'loading'
  | 'denied'
  | 'conflict'
  | 'quota'
  | 'failure';

interface AddTillLoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (message: string) => void;
}

export function AddTillLoginDialog({ open, onOpenChange, onSuccess }: AddTillLoginDialogProps) {
  const statusId = useId();
  const restoreRef = useRef<HTMLElement | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [kind, setKind] = useState<'STAFF' | 'PHARMACIST'>('STAFF');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [status, setStatus] = useState<DialogStatus>('empty');

  useEffect(() => {
    if (open) {
      restoreRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setName('');
      setPhone('');
      setEmail('');
      setPassword('');
      setKind('STAFF');
      setLicenseNumber('');
      setStatus('empty');
    } else {
      restoreRef.current?.focus();
    }
  }, [open]);

  const message =
    status === 'validation' && kind === 'PHARMACIST' && !licenseNumber.trim()
      ? 'Enter the pharmacist licence number.'
      : status === 'validation'
        ? 'Enter name, phone, email, and a password of at least eight characters.'
        : status === 'denied'
          ? 'Only the pharmacy owner can add or remove staff access.'
          : status === 'conflict'
            ? 'That email is already in use at this pharmacy.'
            : status === 'quota'
              ? 'This pharmacy already has the maximum number of staff accounts on the current plan.'
              : status === 'failure'
                ? 'Could not save this staff account. Try again.'
                : null;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !phone.trim() || !email.trim() || password.length < 8) {
      setStatus('validation');
      return;
    }
    if (kind === 'PHARMACIST' && !licenseNumber.trim()) {
      setStatus('validation');
      return;
    }
    setStatus('loading');
    try {
      await createStaff({
        displayName: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        password,
        role: 'pharmacy_staff',
        kind,
        ...(kind === 'PHARMACIST' ? { licenseNumber: licenseNumber.trim() } : {}),
      });
      onSuccess('Staff saved. They cannot sign in until their registration is approved.');
      onOpenChange(false);
    } catch (error) {
      if (isApiError(error) || error instanceof ApiError) {
        if (error.code === 'PLAN_LIMIT') {
          setStatus('quota');
          return;
        }
        if (error.status === 409 || error.code === 'EMAIL_TAKEN') {
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
        <DialogTitle>Add staff</DialogTitle>
        <DialogDescription>
          New staff cannot sign in until their registration is approved. Pharmacists require a
          licence number.
        </DialogDescription>
        {message ? (
          <p id={statusId} role="alert" className="mt-3 text-sm text-ink">
            {message}
          </p>
        ) : null}
        <form onSubmit={onSubmit} className="mt-4 space-y-3" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="staff-name">Name</Label>
            <Input id="staff-name" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="staff-phone">Phone</Label>
            <Input
              id="staff-phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="staff-email">Email</Label>
            <Input
              id="staff-email"
              type="email"
              autoComplete="off"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="staff-password">Temporary password</Label>
            <Input
              id="staff-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="staff-kind">Role</Label>
            <select
              id="staff-kind"
              className="h-10 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink"
              value={kind}
              onChange={(event) => setKind(event.target.value as 'STAFF' | 'PHARMACIST')}
            >
              <option value="STAFF">Staff</option>
              <option value="PHARMACIST">Pharmacist</option>
            </select>
          </div>
          {kind === 'PHARMACIST' ? (
            <div className="space-y-1.5">
              <Label htmlFor="staff-license">Pharmacist licence number</Label>
              <Input
                id="staff-license"
                value={licenseNumber}
                onChange={(event) => setLicenseNumber(event.target.value)}
              />
            </div>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={status === 'loading'}>
              {status === 'loading' ? 'Saving' : 'Save staff'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
