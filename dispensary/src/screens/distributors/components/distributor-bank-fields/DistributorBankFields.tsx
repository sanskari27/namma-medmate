import { Input, Label } from '@atoms';
import type { FormState } from '../../DistributorsScreen.utils';

export type DistributorBankFieldsProps = {
  formId: string;
  form: FormState;
  onChange: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
};

export function DistributorBankFields({ formId, form, onChange }: DistributorBankFieldsProps) {
  return (
    <div className="grid gap-3">
      <p className="font-mono text-[11px] tracking-wide text-muted">Bank / UPI</p>
      <p className="text-xs text-muted">
        Account number and IFSC must be saved together. Re-type the account to confirm a change.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor={`${formId}-bank`}>Bank name</Label>
          <Input
            id={`${formId}-bank`}
            value={form.bankName}
            onChange={(e) => onChange('bankName', e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${formId}-holder`}>Account holder</Label>
          <Input
            id={`${formId}-holder`}
            value={form.accountHolderName}
            onChange={(e) => onChange('accountHolderName', e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${formId}-account`}>Account number</Label>
          <Input
            id={`${formId}-account`}
            value={form.accountNumber}
            onChange={(e) => onChange('accountNumber', e.target.value)}
            className="font-mono text-sm"
            autoComplete="off"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${formId}-confirm-account`}>Confirm account number</Label>
          <Input
            id={`${formId}-confirm-account`}
            value={form.confirmAccountNumber}
            onChange={(e) => onChange('confirmAccountNumber', e.target.value)}
            className="font-mono text-sm"
            autoComplete="off"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${formId}-ifsc`}>IFSC</Label>
          <Input
            id={`${formId}-ifsc`}
            value={form.ifscCode}
            onChange={(e) => onChange('ifscCode', e.target.value)}
            className="font-mono text-sm uppercase"
            autoComplete="off"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${formId}-upi`}>UPI ID</Label>
          <Input
            id={`${formId}-upi`}
            value={form.upiId}
            onChange={(e) => onChange('upiId', e.target.value)}
            className="font-mono text-sm"
          />
        </div>
      </div>
    </div>
  );
}
