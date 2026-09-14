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
    <div className="lc-fields">
      <div className="lc-field">
        <label htmlFor="license-type">Type</label>
        <select
          id="license-type"
          className="lc-select"
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
        <div className="lc-field">
          <label htmlFor="license-staff">Chemist</label>
          <select
            id="license-staff"
            className="lc-select"
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
        <div className="lc-field">
          <label htmlFor="license-scope">Scope</label>
          <select
            id="license-scope"
            className="lc-select"
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
        <div className="lc-field">
          <label htmlFor="license-outlet">Outlet</label>
          <select
            id="license-outlet"
            className="lc-select"
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
      <div className="lc-field">
        <label htmlFor="license-number">Licence number</label>
        <input
          id="license-number"
          className="lc-input"
          value={form.licenseNumber}
          onChange={(event) => onChange({ licenseNumber: event.target.value })}
        />
      </div>
    </div>
  );
}
