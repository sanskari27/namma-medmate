import { Input, Label } from '@atoms';
import type { Branch } from '@/services/branches';
import type { StaffAccount } from '@/services/staff';
import type { FormState } from '../../LicensesScreen.utils';

export type LicenseIdentityFieldsProps = {
  form: FormState;
  creating: boolean;
  branches: Branch[];
  staff: StaffAccount[];
  onChange: (patch: Partial<FormState>) => void;
};

export function LicenseIdentityFields({
  form,
  creating,
  branches,
  staff,
  onChange,
}: LicenseIdentityFieldsProps) {
  return (
    <fieldset className="grid gap-3">
      <legend className="text-sm font-medium text-ink">Paper</legend>
      <div className="grid gap-1">
        <Label htmlFor="license-type">Type</Label>
        <select
          id="license-type"
          className="h-10 rounded-md border border-line bg-surface px-3 text-sm text-ink"
          value={form.docType}
          disabled={!creating}
          onChange={(event) => onChange({ docType: event.target.value as FormState['docType'] })}
        >
          <option value="DRUG_LICENSE">Drug licence</option>
          <option value="GST">GST</option>
          <option value="FSSAI">FSSAI</option>
          <option value="PHARMACIST_REGISTRATION">Pharmacist registration</option>
        </select>
      </div>
      {form.docType === 'PHARMACIST_REGISTRATION' ? (
        <div className="grid gap-1">
          <Label htmlFor="license-staff">Chemist</Label>
          <select
            id="license-staff"
            className="h-10 rounded-md border border-line bg-surface px-3 text-sm text-ink"
            value={form.staffUserId}
            disabled={!creating}
            onChange={(event) => onChange({ staffUserId: event.target.value })}
          >
            <option value="">Select chemist</option>
            {staff.map((person) => (
              <option key={person.id} value={person.id}>
                {person.displayName}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="grid gap-1">
          <Label htmlFor="license-scope">Scope</Label>
          <select
            id="license-scope"
            className="h-10 rounded-md border border-line bg-surface px-3 text-sm text-ink"
            value={form.scope}
            disabled={!creating}
            onChange={(event) => onChange({ scope: event.target.value as FormState['scope'] })}
          >
            <option value="TENANT">Pharmacy</option>
            <option value="BRANCH">Outlet</option>
          </select>
        </div>
      )}
      {form.scope === 'BRANCH' ? (
        <div className="grid gap-1">
          <Label htmlFor="license-outlet">Outlet</Label>
          <select
            id="license-outlet"
            className="h-10 rounded-md border border-line bg-surface px-3 text-sm text-ink"
            value={form.branchId}
            disabled={!creating}
            onChange={(event) => onChange({ branchId: event.target.value })}
          >
            <option value="">Select outlet</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <div className="grid gap-1">
        <Label htmlFor="license-number">Licence number</Label>
        <Input
          id="license-number"
          value={form.licenseNumber}
          onChange={(event) => onChange({ licenseNumber: event.target.value })}
        />
      </div>
    </fieldset>
  );
}
