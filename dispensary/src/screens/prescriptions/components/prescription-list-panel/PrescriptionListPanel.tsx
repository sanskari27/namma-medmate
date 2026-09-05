import type { PrescriptionReference } from '@/services/prescriptionReferences';
import { formatIst, statusLabel } from '../../PrescriptionsScreen.utils';

export type PrescriptionListPanelProps = {
  items: PrescriptionReference[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function PrescriptionListPanel({
  items,
  selectedId,
  onSelect,
}: PrescriptionListPanelProps) {
  if (items.length === 0) {
    return (
      <p className="border border-dashed border-line px-3 py-6 text-sm text-muted">
        Nothing on this list. Switch Active / Archived, or collect a bill with an Rx reference.
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
              <span className="font-mono text-sm font-medium text-ink">
                {row.prescriptionReference}
              </span>
              <span className="text-xs text-muted">{row.customerName || 'Patient'}</span>
              <span className="text-xs text-muted">
                {statusLabel(row.status)} · attached {formatIst(row.issuedAt)}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
