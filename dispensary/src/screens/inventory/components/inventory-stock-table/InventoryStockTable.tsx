import type { InventoryOverviewRow } from '@/services/inventory';
import { INVENTORY_CONTENT } from '../../InventoryScreen.content';
import { InventoryStockRow } from '../inventory-stock-row';

type InventoryStockTableProps = {
  rows: InventoryOverviewRow[];
  flagBusyId: string | null;
  emptyMessage: string;
  onToggleLoose: (productId: string, next: boolean) => void;
  onToggleOnline: (productId: string, next: boolean) => void;
  onEdit: (productId: string) => void;
  onOpenBatches: (productId: string) => void;
};

const COLUMNS = [
  INVENTORY_CONTENT.columns.product,
  INVENTORY_CONTENT.columns.category,
  INVENTORY_CONTENT.columns.schedule,
  INVENTORY_CONTENT.columns.rack,
  INVENTORY_CONTENT.columns.batches,
  INVENTORY_CONTENT.columns.stock,
  INVENTORY_CONTENT.columns.mrp,
  INVENTORY_CONTENT.columns.value,
  INVENTORY_CONTENT.columns.loose,
  INVENTORY_CONTENT.columns.online,
  '',
] as const;

export function InventoryStockTable({
  rows,
  flagBusyId,
  emptyMessage,
  onToggleLoose,
  onToggleOnline,
  onEdit,
  onOpenBatches,
}: InventoryStockTableProps) {
  return (
    <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-line/70 bg-surface">
      <table className="w-full min-w-[72rem] border-collapse text-left">
        <thead className="sticky top-0 z-10 bg-brand-soft/80 backdrop-blur-sm">
          <tr>
            {COLUMNS.map((label, index) => (
              <th
                key={`${label}-${index}`}
                scope="col"
                className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted"
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={COLUMNS.length} className="px-4 py-10 text-center text-sm text-muted">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <InventoryStockRow
                key={row.productId}
                row={row}
                busy={flagBusyId === row.productId}
                onToggleLoose={(next) => onToggleLoose(row.productId, next)}
                onToggleOnline={(next) => onToggleOnline(row.productId, next)}
                onEdit={() => onEdit(row.productId)}
                onOpenBatches={() => onOpenBatches(row.productId)}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
