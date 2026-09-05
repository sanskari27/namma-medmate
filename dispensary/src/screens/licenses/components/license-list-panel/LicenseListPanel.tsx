import type { ComplianceLicense } from '@/services/licenses';
import { formatIstDate, scopeLabel, typeLabel } from '../../LicensesScreen.utils';

export type LicenseListPanelProps = {
  items: ComplianceLicense[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function LicenseListPanel({ items, selectedId, onSelect }: LicenseListPanelProps) {
  if (items.length === 0) {
    return (
      <p className="border border-dashed border-line px-3 py-6 text-sm text-muted">
        File the first paper from this counter.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-line border border-line bg-surface">
      {items.map((row) => {
        const selected = row.id === selectedId;
        return (
          <li key={row.id}>
            <button
              type="button"
              aria-current={selected ? 'true' : undefined}
              className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm ${
                selected ? 'bg-brand-soft' : 'hover:bg-canvas'
              }`}
              onClick={() => onSelect(row.id)}
            >
              <span className="font-medium text-ink">{typeLabel(row.docType)}</span>
              <span className="font-mono text-xs text-muted">{row.licenseNumber}</span>
              <span className="text-xs text-muted">
                {scopeLabel(row.scope)} · expires {formatIstDate(row.expiresOn)}
                {row.due ? ' · due' : ''}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
