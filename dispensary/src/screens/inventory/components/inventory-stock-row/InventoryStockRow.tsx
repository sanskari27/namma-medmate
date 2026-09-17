import { Button, CategoryMark, Switch } from '@atoms';
import { MapPin, Pencil } from 'lucide-react';
import type { InventoryOverviewRow } from '@/services/inventory';
import { INVENTORY_CONTENT } from '../../InventoryScreen.content';
import {
  formatExpiry,
  formatPaise,
  formatQty,
  productMeta,
  scheduleLabel,
} from '../../InventoryScreen.format';

type InventoryStockRowProps = {
  row: InventoryOverviewRow;
  busy: boolean;
  onToggleLoose: (next: boolean) => void;
  onToggleOnline: (next: boolean) => void;
  onEdit: () => void;
  onOpenBatches: () => void;
};

export function InventoryStockRow({
  row,
  busy,
  onToggleLoose,
  onToggleOnline,
  onEdit,
  onOpenBatches,
}: InventoryStockRowProps) {
  const schedule = scheduleLabel(row);
  const stockClass = row.lowStock
    ? 'rounded-md bg-[#fff1e6] px-2 py-1 text-warn'
    : row.outOfStock
      ? 'text-muted'
      : 'text-brand';

  return (
    <tr className="border-b border-line/60 last:border-0">
      <td className="px-3 py-3 align-middle">
        <div className="flex min-w-[14rem] items-start gap-2.5">
          <CategoryMark icon={row.categoryIcon} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{row.name}</p>
            <p className="truncate text-xs text-muted">{productMeta(row)}</p>
          </div>
        </div>
      </td>
      <td className="px-3 py-3 align-middle text-sm text-muted">
        {row.categoryName ?? '—'}
      </td>
      <td className="px-3 py-3 align-middle">
        <span className="inline-flex rounded-full border border-brand/30 bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand">
          {schedule}
        </span>
      </td>
      <td className="px-3 py-3 align-middle">
        {row.rackLocation ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-xs text-brand">
            <MapPin className="size-3" aria-hidden />
            {row.rackLocation}
          </span>
        ) : (
          <span className="text-xs text-muted">—</span>
        )}
      </td>
      <td className="px-3 py-3 align-middle text-sm">
        <button
          type="button"
          className="flex flex-col gap-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          onClick={onOpenBatches}
          aria-label={`${row.name} batches`}
        >
          <span className="tabular-nums text-ink">
            {row.batchCount} batch{row.batchCount === 1 ? '' : 'es'}
          </span>
          <span className="flex flex-wrap items-center gap-1 text-xs">
            <span className={row.expired || row.nearExpiry ? 'text-warn' : 'text-muted'}>
              {formatExpiry(row.earliestExpiry)}
            </span>
            {row.expired ? (
              <span className="rounded bg-[#fde8e8] px-1.5 py-0.5 text-[10px] font-medium text-danger">
                Expired
              </span>
            ) : null}
          </span>
        </button>
      </td>
      <td className="px-3 py-3 align-middle">
        <span className={`inline-flex items-center gap-1.5 text-sm tabular-nums ${stockClass}`}>
          <span
            className={`size-1.5 rounded-full ${
              row.lowStock ? 'bg-warn' : row.outOfStock ? 'bg-muted' : 'bg-brand'
            }`}
            aria-hidden
          />
          {row.lowStock ? `Low · ${formatQty(row.onHandQuantity, row.packUnit)}` : formatQty(row.onHandQuantity, row.packUnit)}
        </span>
      </td>
      <td className="px-3 py-3 align-middle text-sm tabular-nums text-ink">
        {formatPaise(row.mrpPaise)}
      </td>
      <td className="px-3 py-3 align-middle text-sm tabular-nums text-ink">
        {formatPaise(row.retailValuePaise)}
      </td>
      <td className="px-3 py-3 align-middle">
        <div className="flex flex-col items-start gap-1">
          <Switch
            checked={row.looseSellingEnabled}
            onCheckedChange={onToggleLoose}
            disabled={busy}
            label={`Toggle loose selling for ${row.name}`}
          />
          {row.looseSellingEnabled && row.looseUnitPaise != null ? (
            <span className="text-[11px] tabular-nums text-muted">
              {formatPaise(row.looseUnitPaise)}/unit
            </span>
          ) : null}
        </div>
      </td>
      <td className="px-3 py-3 align-middle">
        <Switch
          checked={row.onlineListed}
          onCheckedChange={onToggleOnline}
          disabled={busy}
          label={`Toggle online for ${row.name}`}
        />
      </td>
      <td className="px-3 py-3 align-middle">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className="h-8 gap-1 px-2 text-muted hover:text-ink"
          aria-label={`${INVENTORY_CONTENT.edit} ${row.name}`}
        >
          <Pencil className="size-3.5" aria-hidden />
          {INVENTORY_CONTENT.edit}
        </Button>
      </td>
    </tr>
  );
}
