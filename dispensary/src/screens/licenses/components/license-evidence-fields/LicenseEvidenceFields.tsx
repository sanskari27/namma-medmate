import { licenseEvidenceUrl, type LicenseEvidence } from '@/services/licenses';
import { formatIstDate } from '../../LicensesScreen.utils';

export type LicenseEvidenceFieldsProps = {
  licenseId?: string | null;
  prior: LicenseEvidence[];
  onFile: (file: File | null) => void;
};

export function LicenseEvidenceFields({ licenseId, prior, onFile }: LicenseEvidenceFieldsProps) {
  return (
    <div className="lc-form">
      <div className="lc-field">
        <label htmlFor="license-evidence">Current paper</label>
        <input
          id="license-evidence"
          className="lc-input"
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          onChange={(event) => onFile(event.target.files?.[0] ?? null)}
        />
      </div>
      {prior.length > 0 ? (
        <ul className="lc-card lc-card-pad" style={{ listStyle: 'none', margin: 0, padding: 12 }} aria-label="Prior papers">
          {prior.map((row) => (
            <li key={row.id} className="lc-row">
              <span className="lc-muted">
                {row.licenseNumber} · {formatIstDate(row.issuedOn)} – {formatIstDate(row.expiresOn)}
              </span>
              {licenseId ? (
                <a className="lc-btn lc-btn-ghost lc-btn-sm" href={licenseEvidenceUrl(licenseId, row.id)} target="_blank" rel="noreferrer">
                  Open paper
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
