import type { Supplier } from '@/services/suppliers';
import { statusLabel, typeLabel } from '../../DistributorsScreen.utils';

export type DistributorListRowProps = {
  supplier: Supplier;
  active: boolean;
  nameId: string;
  metaId: string;
  onSelect: (supplier: Supplier) => void;
};

export function DistributorListRow({
  supplier,
  active,
  nameId,
  metaId,
  onSelect,
}: DistributorListRowProps) {
  return (
    <li className="flex items-stretch">
      <span
        className={`w-1 shrink-0 ${supplier.status === 'ACTIVE' ? 'bg-brand' : 'bg-warn'}`}
        aria-hidden
      />
      <button
        type="button"
        aria-labelledby={nameId}
        aria-describedby={metaId}
        className={`flex min-w-0 flex-1 cursor-pointer flex-col gap-0.5 px-3 py-2.5 text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus ${
          active ? 'bg-brand-soft' : 'hover:bg-canvas/80'
        }`}
        onClick={() => onSelect(supplier)}
        aria-current={active ? 'true' : undefined}
      >
        <span id={nameId} className="truncate text-sm font-medium text-ink">
          {supplier.tradeName || supplier.legalName}
        </span>
        <span id={metaId} className="font-mono text-xs tabular-nums text-muted">
          {supplier.supplierCode} {typeLabel(supplier.supplierType)} {statusLabel(supplier.status)}
        </span>
      </button>
    </li>
  );
}
