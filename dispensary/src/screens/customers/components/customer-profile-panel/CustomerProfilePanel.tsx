import { Button, Input, Label } from '@atoms';
import type { Customer } from '@/services/customers';
import { Users } from 'lucide-react';
import { FormEvent, type ReactNode } from 'react';
import type { FormState } from '../../CustomersScreen.utils';
import { formatPhone } from '../../CustomersScreen.utils';

export type CustomerProfilePanelProps = {
  formId: string;
  statusId: string;
  selected: Customer | null;
  form: FormState;
  busy: boolean;
  describedByStatus: boolean;
  onChange: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  onSave: (event: FormEvent) => void;
  onClose: () => void;
  onMerge?: () => void;
  mergeButtonRef?: { current: HTMLButtonElement | null };
  familySection?: ReactNode;
  familyHistory?: ReactNode;
  purchaseHistory?: ReactNode;
  doctorSection?: ReactNode;
  creditSection?: ReactNode;
};

export function CustomerProfilePanel({
  formId,
  statusId,
  selected,
  form,
  busy,
  describedByStatus,
  onChange,
  onSave,
  onClose,
  onMerge,
  mergeButtonRef,
  familySection,
  familyHistory,
  purchaseHistory,
  doctorSection,
  creditSection,
}: CustomerProfilePanelProps) {
  if (!selected) {
    return (
      <section
        aria-label="Customer profile"
        className="flex h-full min-h-0 flex-col border border-line bg-surface"
      >
        <div className="flex h-full flex-col items-start justify-center gap-3 px-6 py-10">
          <Users className="size-8 text-brand" aria-hidden />
          <div>
            <h2 className="font-sans text-base font-semibold text-ink">Select a customer</h2>
            <p className="mt-1 max-w-sm text-sm text-muted">
              Pick a row or use Add customer at the top. Allergy and chronic notes show as a warm
              rail on the list.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Customer profile"
      className="flex h-full min-h-0 flex-col border border-line bg-surface"
    >
      <form
        className="flex min-h-0 flex-1 flex-col gap-0"
        onSubmit={onSave}
        noValidate
        aria-describedby={describedByStatus ? statusId : undefined}
      >
        <div className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0">
            <h2 className="font-sans text-base font-semibold text-ink">Edit customer</h2>
            <p className="mt-0.5 text-sm text-muted">
              Update health and contact details for this walk-in.
            </p>
            <p className="mt-2 font-mono text-xs tabular-nums text-muted">
              {formatPhone(selected.phone)}
              {selected.bloodGroup ? ` · ${selected.bloodGroup}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {onMerge ? (
              <Button
                ref={mergeButtonRef}
                type="button"
                variant="outline"
                onClick={onMerge}
                aria-haspopup="dialog"
              >
                Merge duplicate
              </Button>
            ) : null}
            <Button type="button" variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        <fieldset
          disabled={busy}
          className="panel-scroll grid min-h-0 flex-1 content-start gap-5 overflow-y-auto px-4 py-4"
        >
          <div className="grid gap-3">
            <p className="font-mono text-[11px] tracking-wide text-muted">Contact</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor={`${formId}-name`}>Name</Label>
                <Input
                  id={`${formId}-name`}
                  value={form.name}
                  onChange={(e) => onChange('name', e.target.value)}
                  autoComplete="name"
                  required
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`${formId}-phone`}>Phone</Label>
                <Input
                  id={`${formId}-phone`}
                  value={form.phone}
                  onChange={(e) => onChange('phone', e.target.value)}
                  inputMode="tel"
                  autoComplete="tel"
                  required
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`${formId}-email`}>Email</Label>
                <Input
                  id={`${formId}-email`}
                  type="email"
                  value={form.email}
                  onChange={(e) => onChange('email', e.target.value)}
                  autoComplete="email"
                />
              </div>
              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor={`${formId}-address`}>Address</Label>
                <Input
                  id={`${formId}-address`}
                  value={form.address}
                  onChange={(e) => onChange('address', e.target.value)}
                  autoComplete="street-address"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-3 border-t border-line pt-4">
            <p className="font-mono text-[11px] tracking-wide text-muted">Health on file</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor={`${formId}-dob`}>Date of birth</Label>
                <Input
                  id={`${formId}-dob`}
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => onChange('dateOfBirth', e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`${formId}-gender`}>Gender</Label>
                <Input
                  id={`${formId}-gender`}
                  value={form.gender}
                  onChange={(e) => onChange('gender', e.target.value)}
                  placeholder="e.g. MALE"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`${formId}-blood`}>Blood group</Label>
                <Input
                  id={`${formId}-blood`}
                  value={form.bloodGroup}
                  onChange={(e) => onChange('bloodGroup', e.target.value)}
                  placeholder="e.g. B+"
                  className="font-mono"
                />
              </div>
              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor={`${formId}-allergies`}>Allergies</Label>
                <Input
                  id={`${formId}-allergies`}
                  value={form.allergies}
                  onChange={(e) => onChange('allergies', e.target.value)}
                />
              </div>
              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor={`${formId}-chronic`}>Chronic conditions</Label>
                <Input
                  id={`${formId}-chronic`}
                  value={form.chronicConditions}
                  onChange={(e) => onChange('chronicConditions', e.target.value)}
                />
              </div>
            </div>
          </div>

          {creditSection}
          {purchaseHistory}
          {doctorSection}
          {familySection}
          {familyHistory}
        </fieldset>

        <div className="flex shrink-0 flex-wrap gap-2 border-t border-line px-4 py-3">
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save changes'}
          </Button>
          <Button type="button" variant="ghost" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </section>
  );
}
