import { Input, Label } from '@atoms';
import { licenseEvidenceUrl, type LicenseEvidence } from '@/services/licenses';
import { formatIstDate } from '../../LicensesScreen.utils';

export type LicenseEvidenceFieldsProps = {
  licenseId?: string | null;
  prior: LicenseEvidence[];
  onFile: (file: File | null) => void;
};

export function LicenseEvidenceFields({ licenseId, prior, onFile }: LicenseEvidenceFieldsProps) {
  return (
    <fieldset className="grid gap-2">
      <legend className="text-sm font-medium text-ink">Evidence</legend>
      <div className="grid gap-1">
        <Label htmlFor="license-evidence">Current paper</Label>
        <Input
          id="license-evidence"
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          onChange={(event) => onFile(event.target.files?.[0] ?? null)}
        />
      </div>
      {prior.length > 0 ? (
        <ul className="border border-line px-3 py-2 text-xs text-muted" aria-label="Prior papers">
          {prior.map((row) => (
            <li key={row.id} className="flex flex-wrap items-baseline justify-between gap-2 py-0.5">
              <span>
                {row.licenseNumber} · {formatIstDate(row.issuedOn)} – {formatIstDate(row.expiresOn)}
              </span>
              {licenseId ? (
                <a
                  className="text-brand underline-offset-2 hover:underline"
                  href={licenseEvidenceUrl(licenseId, row.id)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open paper
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </fieldset>
  );
}
