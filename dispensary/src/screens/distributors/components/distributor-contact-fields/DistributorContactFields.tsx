import { Input, Label } from '@atoms';
import type { FormState } from '../../DistributorsScreen.utils';

export type DistributorContactFieldsProps = {
  formId: string;
  form: FormState;
  onChange: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
};

export function DistributorContactFields({
  formId,
  form,
  onChange,
}: DistributorContactFieldsProps) {
  return (
    <div className="grid gap-3">
      <p className="font-mono text-[11px] tracking-wide text-muted">Contact</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor={`${formId}-contact`}>Contact person</Label>
          <Input
            id={`${formId}-contact`}
            value={form.contactPersonName}
            onChange={(e) => onChange('contactPersonName', e.target.value)}
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${formId}-role`}>Role</Label>
          <Input
            id={`${formId}-role`}
            value={form.contactPersonRole}
            onChange={(e) => onChange('contactPersonRole', e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${formId}-phone`}>Phone</Label>
          <Input
            id={`${formId}-phone`}
            value={form.phone}
            onChange={(e) => onChange('phone', e.target.value)}
            required
            className="font-mono text-sm"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${formId}-alt-phone`}>Alternate phone</Label>
          <Input
            id={`${formId}-alt-phone`}
            value={form.alternatePhone}
            onChange={(e) => onChange('alternatePhone', e.target.value)}
            className="font-mono text-sm"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${formId}-email`}>Email</Label>
          <Input
            id={`${formId}-email`}
            type="email"
            value={form.email}
            onChange={(e) => onChange('email', e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${formId}-website`}>Website</Label>
          <Input
            id={`${formId}-website`}
            value={form.website}
            onChange={(e) => onChange('website', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
