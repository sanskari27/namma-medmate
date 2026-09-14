import type { FormState } from '../../LicensesScreen.utils';

export type LicenseDateFieldsProps = {
  form: FormState;
  onChange: (patch: Partial<FormState>) => void;
};

export function LicenseDateFields({ form, onChange }: LicenseDateFieldsProps) {
  return (
    <div className="lc-fields">
      <div className="lc-field">
        <label htmlFor="license-issued">Issued on</label>
        <input
          id="license-issued"
          className="lc-input"
          type="date"
          value={form.issuedOn}
          onChange={(event) => onChange({ issuedOn: event.target.value })}
        />
      </div>
      <div className="lc-field">
        <label htmlFor="license-expires">Expires on</label>
        <input
          id="license-expires"
          className="lc-input"
          type="date"
          value={form.expiresOn}
          onChange={(event) => onChange({ expiresOn: event.target.value })}
        />
      </div>
    </div>
  );
}
