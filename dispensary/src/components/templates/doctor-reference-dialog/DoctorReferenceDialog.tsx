import { Button, Input, Label } from '@atoms';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@molecules/dialog/Dialog';
import { createDoctor, isApiError } from '@/services/doctors';
import { Stethoscope } from 'lucide-react';
import { FormEvent, useEffect, useId, useState } from 'react';
import { DoctorDialogStatus } from './DoctorDialogStatus';
import type { DialogStatus } from './doctorDialog.types';

export type DoctorReferenceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  onCloseFocus?: () => void;
};

export function DoctorReferenceDialog({
  open,
  onOpenChange,
  onSaved,
  onCloseFocus,
}: DoctorReferenceDialogProps) {
  const formId = useId();
  const statusId = `${formId}-status`;
  const [name, setName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<DialogStatus>(null);
  const [busy, setBusy] = useState(false);

  function restoreFocus() {
    onCloseFocus?.();
  }

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    setName('');
    setRegistrationNumber('');
    setPhone('');
    setNotes('');
    setBusy(false);
    setStatus(null);
    const t = window.setTimeout(() => {
      document.getElementById(`${formId}-name`)?.focus();
    }, 0);
    return () => window.clearTimeout(t);
  }, [open, formId]);

  async function onConfirm(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setStatus('validation');
      return;
    }
    setBusy(true);
    setStatus('loading');
    try {
      await createDoctor({
        name: name.trim(),
        registrationNumber: registrationNumber.trim() || undefined,
        phone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setStatus('success');
      onSaved();
      onOpenChange(false);
      restoreFocus();
    } catch (error) {
      if (isApiError(error) && (error.status === 403 || error.code === 'FORBIDDEN')) {
        setStatus('denied');
      } else if (
        isApiError(error) &&
        (error.status === 409 || error.code === 'REGISTRATION_TAKEN')
      ) {
        setStatus('conflict');
      } else if (isApiError(error) && error.status === 400) {
        setStatus('validation');
      } else {
        setStatus('failure');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          restoreFocus();
        }
      }}
    >
      <DialogContent className="max-w-md gap-4 border-line bg-surface p-5">
        <div className="flex items-start gap-3">
          <Stethoscope className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
          <div>
            <DialogTitle className="font-sans text-base font-semibold text-ink">
              Add doctor reference
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-muted">
              Referring doctors stay on the counter book — no login.
            </DialogDescription>
          </div>
        </div>

        <form className="grid gap-3" onSubmit={onConfirm} noValidate aria-describedby={statusId}>
          <div className="grid gap-1.5">
            <Label htmlFor={`${formId}-name`}>Name</Label>
            <Input
              id={`${formId}-name`}
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              disabled={busy}
            />
          </div>
          <div className="grid gap-1.5 sm:grid-cols-2 sm:gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor={`${formId}-reg`}>Registration</Label>
              <Input
                id={`${formId}-reg`}
                value={registrationNumber}
                onChange={(event) => setRegistrationNumber(event.target.value)}
                className="font-mono"
                disabled={busy}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`${formId}-phone`}>Phone</Label>
              <Input
                id={`${formId}-phone`}
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                inputMode="tel"
                disabled={busy}
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`${formId}-notes`}>Notes</Label>
            <Input
              id={`${formId}-notes`}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={busy}
            />
          </div>

          <DoctorDialogStatus status={status} statusId={statusId} />

          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save doctor'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => {
                onOpenChange(false);
                restoreFocus();
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
