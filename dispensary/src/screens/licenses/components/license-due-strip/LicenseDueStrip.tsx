import type { ComplianceLicense } from '@/services/licenses';
import { formatIstDate, typeLabel } from '../../LicensesScreen.utils';

export type LicenseDueStripProps = {
  items: ComplianceLicense[];
  onSelect: (id: string) => void;
};

export function LicenseDueStrip({ items, onSelect }: LicenseDueStripProps) {
  if (items.length === 0) {
    return null;
  }
  return (
    <section className="border border-warn/40 bg-surface px-3 py-2" aria-label="Due soon">
      <p className="text-xs font-medium text-warn">Due within 30 days</p>
      <ul className="mt-1 flex flex-wrap gap-2">
        {items.map((row) => (
          <li key={row.id}>
            <button
              type="button"
              className="text-sm text-ink underline-offset-2 hover:underline"
              onClick={() => onSelect(row.id)}
            >
              {typeLabel(row.docType)} · {formatIstDate(row.expiresOn)}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
