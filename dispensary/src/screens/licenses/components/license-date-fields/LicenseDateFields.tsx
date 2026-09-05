import { Input, Label } from '@atoms';
import type { FormState } from '../../LicensesScreen.utils';

export type LicenseDateFieldsProps = {
  form: FormState;
  onChange: (patch: Partial<FormState>) => void;
};

export function LicenseDateFields({ form, onChange }: LicenseDateFieldsProps) {
  return (
    <fieldset className="grid gap-3 sm:grid-cols-2">
      <legend className="col-span-full text-sm font-medium text-ink">Dates (IST calendar)</legend>
      <div className="grid gap-1">
        <Label htmlFor="license-issued">Issued on</Label>
        <Input
          id="license-issued"
          type="date"
          value={form.issuedOn}
          onChange={(event) => onChange({ issuedOn: event.target.value })}
        />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="license-expires">Expires on</Label>
        <Input
          id="license-expires"
          type="date"
          value={form.expiresOn}
          onChange={(event) => onChange({ expiresOn: event.target.value })}
        />
      </div>
    </fieldset>
  );
}
