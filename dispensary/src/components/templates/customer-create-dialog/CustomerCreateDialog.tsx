import { Button, Input, Label } from '@atoms';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@molecules/dialog/Dialog';
import {
  createCustomer,
  isApiError,
  type Customer,
  type CustomerInput,
} from '@/services/customers';
import { FormEvent, useEffect, useId, useState } from 'react';

export type CustomerCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (customer: Customer) => void;
  onPhoneConflict?: (phone: string) => void;
  restoreFocusRef?: { current: HTMLElement | null };
  onCloseFocus?: () => void;
};

type FormState = {
  name: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  bloodGroup: string;
  allergies: string;
  chronicConditions: string;
};

const emptyForm: FormState = {
  name: '',
  phone: '',
  email: '',
  dateOfBirth: '',
  gender: '',
  address: '',
  bloodGroup: '',
  allergies: '',
  chronicConditions: '',
};

type FormStatus = 'validation' | 'conflict' | 'failure' | null;

export function CustomerCreateDialog({
  open,
  onOpenChange,
  onCreated,
  onPhoneConflict,
  restoreFocusRef,
  onCloseFocus,
}: CustomerCreateDialogProps) {
  const formId = useId();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [status, setStatus] = useState<FormStatus>(null);
  const [busy, setBusy] = useState(false);

  function restoreFocus() {
    restoreFocusRef?.current?.focus();
    onCloseFocus?.();
  }

  useEffect(() => {
    if (open) {
      setForm(emptyForm);
      setStatus(null);
      const t = window.setTimeout(() => {
        document.getElementById(`${formId}-name`)?.focus();
      }, 0);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [open, formId]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      setStatus('validation');
      return;
    }
    setBusy(true);
    setStatus(null);
    const input: CustomerInput = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || undefined,
      dateOfBirth: form.dateOfBirth.trim() || undefined,
      gender: form.gender.trim() || undefined,
      address: form.address.trim() || undefined,
      bloodGroup: form.bloodGroup.trim() || undefined,
      allergies: form.allergies.trim() || undefined,
      chronicConditions: form.chronicConditions.trim() || undefined,
    };
    try {
      const created = await createCustomer(input);
      onCreated(created);
      onOpenChange(false);
      restoreFocus();
    } catch (error) {
      if (isApiError(error) && error.code === 'PHONE_TAKEN') {
        setStatus('conflict');
        onPhoneConflict?.(form.phone.trim());
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
      <DialogContent
        className="max-w-lg max-h-[90vh] overflow-y-auto"
        aria-describedby={`${formId}-desc`}
      >
        <DialogTitle className="font-sans text-lg font-semibold text-ink">
          Add customer at this counter
        </DialogTitle>
        <DialogDescription id={`${formId}-desc`} className="mt-1 text-sm text-muted">
          Phone is unique for this pharmacy. Walk-ins keep one shared profile across outlets.
        </DialogDescription>
        {status === 'validation' ? (
          <p role="alert" className="mt-3 text-sm text-danger">
            Name and phone are required before saving this customer.
          </p>
        ) : null}
        {status === 'conflict' ? (
          <p role="alert" className="mt-3 text-sm text-warn">
            A customer with this phone already exists. Search the floor list or open that profile.
          </p>
        ) : null}
        {status === 'failure' ? (
          <p role="alert" className="mt-3 text-sm text-danger">
            Could not reach the server for this customer. Try again.
          </p>
        ) : null}
        <form className="mt-4 grid gap-3" onSubmit={onSubmit} noValidate>
          <div className="grid gap-1.5">
            <Label htmlFor={`${formId}-name`}>Name</Label>
            <Input
              id={`${formId}-name`}
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              autoComplete="name"
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`${formId}-phone`}>Phone</Label>
            <Input
              id={`${formId}-phone`}
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              inputMode="tel"
              autoComplete="tel"
              required
            />
          </div>
          <div className="grid gap-1.5 sm:grid-cols-2 sm:gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor={`${formId}-email`}>Email</Label>
              <Input
                id={`${formId}-email`}
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`${formId}-dob`}>Date of birth</Label>
              <Input
                id={`${formId}-dob`}
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => update('dateOfBirth', e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-1.5 sm:grid-cols-2 sm:gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor={`${formId}-gender`}>Gender</Label>
              <Input
                id={`${formId}-gender`}
                value={form.gender}
                onChange={(e) => update('gender', e.target.value)}
                placeholder="e.g. MALE"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`${formId}-blood`}>Blood group</Label>
              <Input
                id={`${formId}-blood`}
                value={form.bloodGroup}
                onChange={(e) => update('bloodGroup', e.target.value)}
                placeholder="e.g. B+"
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`${formId}-address`}>Address</Label>
            <Input
              id={`${formId}-address`}
              value={form.address}
              onChange={(e) => update('address', e.target.value)}
              autoComplete="street-address"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`${formId}-allergies`}>Allergies</Label>
            <Input
              id={`${formId}-allergies`}
              value={form.allergies}
              onChange={(e) => update('allergies', e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`${formId}-chronic`}>Chronic conditions</Label>
            <Input
              id={`${formId}-chronic`}
              value={form.chronicConditions}
              onChange={(e) => update('chronicConditions', e.target.value)}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save customer'}
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
            {status === 'conflict' ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onPhoneConflict?.(form.phone.trim());
                  onOpenChange(false);
                  restoreFocus();
                }}
              >
                Search this phone
              </Button>
            ) : null}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
