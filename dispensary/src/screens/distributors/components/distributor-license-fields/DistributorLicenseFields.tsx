import { Input, Label } from '@atoms';
import type { SupplierLicenseStatus } from '@/services/suppliers';
import {
  LICENSE_TYPES,
  licenseStatusCopy,
  licenseTone,
  type FormState,
} from '../../DistributorsScreen.utils';

const selectClass = 'h-10 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink';

export type DistributorLicenseFieldsProps = {
  formId: string;
  form: FormState;
  licenseStatus?: SupplierLicenseStatus | null;
  onChange: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
};

export function DistributorLicenseFields({
  formId,
  form,
  licenseStatus,
  onChange,
}: DistributorLicenseFieldsProps) {
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-[11px] tracking-wide text-muted">Licenses</p>
        {licenseStatus ? (
          <p className={`text-xs ${licenseTone(licenseStatus)}`} data-testid="license-status">
            {licenseStatusCopy(licenseStatus)}
          </p>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor={`${formId}-dl-no`}>Drug license number</Label>
          <Input
            id={`${formId}-dl-no`}
            value={form.drugLicenseNumber}
            onChange={(e) => onChange('drugLicenseNumber', e.target.value)}
            className="font-mono text-sm"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${formId}-dl-type`}>Drug license type</Label>
          <select
            id={`${formId}-dl-type`}
            className={selectClass}
            value={form.drugLicenseType}
            onChange={(e) =>
              onChange('drugLicenseType', e.target.value as FormState['drugLicenseType'])
            }
          >
            <option value="">Not set</option>
            {LICENSE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type === 'MANUFACTURING'
                  ? 'Manufacturing'
                  : type === 'WHOLESALE'
                    ? 'Wholesale'
                    : 'Retail'}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${formId}-dl-exp`}>Drug license expiry</Label>
          <Input
            id={`${formId}-dl-exp`}
            type="date"
            value={form.drugLicenseExpiry}
            onChange={(e) => onChange('drugLicenseExpiry', e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${formId}-fssai`}>FSSAI number</Label>
          <Input
            id={`${formId}-fssai`}
            value={form.fssaiLicenseNumber}
            onChange={(e) => onChange('fssaiLicenseNumber', e.target.value)}
            className="font-mono text-sm"
          />
        </div>
      </div>
    </div>
  );
}
