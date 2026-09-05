import { Button } from '@atoms';
import type { Branch } from '@/services/branches';
import type { ComplianceLicense } from '@/services/licenses';
import type { StaffAccount } from '@/services/staff';
import type { FormState } from '../../LicensesScreen.utils';
import { LicenseDateFields } from '../license-date-fields';
import { LicenseEvidenceFields } from '../license-evidence-fields';
import { LicenseIdentityFields } from '../license-identity-fields';

export type LicenseFormPanelProps = {
  form: FormState;
  creating: boolean;
  selected: ComplianceLicense | null;
  branches: Branch[];
  staff: StaffAccount[];
  busy: boolean;
  onChange: (patch: Partial<FormState>) => void;
  onSave: () => void;
};

export function LicenseFormPanel({
  form,
  creating,
  selected,
  branches,
  staff,
  busy,
  onChange,
  onSave,
}: LicenseFormPanelProps) {
  return (
    <form
      className="flex min-h-0 flex-col gap-4 border border-line bg-surface p-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <LicenseIdentityFields
        form={form}
        creating={creating}
        branches={branches}
        staff={staff}
        onChange={onChange}
      />
      <LicenseDateFields form={form} onChange={onChange} />
      <LicenseEvidenceFields
        licenseId={selected?.id}
        prior={selected?.evidence ?? []}
        onFile={(evidence) => onChange({ evidence })}
      />
      <div className="mt-auto border-t border-line pt-3">
        <Button type="submit" disabled={busy}>
          {creating ? 'File this licence' : 'Renew this licence'}
        </Button>
      </div>
    </form>
  );
}
