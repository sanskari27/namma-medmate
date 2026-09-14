import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import { LicenseDateFields } from '../license-date-fields';
import { LicenseEvidenceFields } from '../license-evidence-fields';
import { LicenseIdentityFields } from '../license-identity-fields';
import {
  formPatched,
  saveLicense,
  selectLicensesBranches,
  selectLicensesBusy,
  selectLicensesCreating,
  selectLicensesForm,
  selectLicensesSelected,
  selectLicensesStaff,
} from '../../store';

export function LicenseFormPanel() {
  const dispatch = useDispatch<AppDispatch>();
  const form = useSelector(selectLicensesForm);
  const creating = useSelector(selectLicensesCreating);
  const selected = useSelector(selectLicensesSelected);
  const branches = useSelector(selectLicensesBranches);
  const staff = useSelector(selectLicensesStaff);
  const busy = useSelector(selectLicensesBusy);

  if (!creating && !selected) {
    return (
      <div className="lc-card lc-card-pad">
        <p className="lc-muted">Select a licence or add a new paper.</p>
      </div>
    );
  }

  return (
    <form
      className="lc-card lc-card-pad lc-form"
      onSubmit={(event) => {
        event.preventDefault();
        void dispatch(saveLicense());
      }}
    >
      <LicenseIdentityFields
        form={form}
        creating={creating}
        branches={branches}
        staff={staff}
        onChange={(patch) => dispatch(formPatched(patch))}
      />
      <LicenseDateFields form={form} onChange={(patch) => dispatch(formPatched(patch))} />
      <LicenseEvidenceFields
        licenseId={selected?.id}
        prior={selected?.evidence ?? []}
        onFile={(evidence) => dispatch(formPatched({ evidence }))}
      />
      <button type="submit" className="lc-btn lc-btn-primary" disabled={busy}>
        {creating ? 'File this licence' : 'Renew this licence'}
      </button>
    </form>
  );
}
