import { Button, Input } from '@atoms';
import { FileDown, FileSpreadsheet, MapPin, Plus, Search } from 'lucide-react';
import { INVENTORY_CONTENT } from '../../InventoryScreen.content';

type InventoryToolbarProps = {
  query: string;
  onQueryChange: (value: string) => void;
  onExcel: () => void;
  onPdf: () => void;
  onRackLocations: () => void;
  onAddStock: () => void;
};

export function InventoryToolbar({
  query,
  onQueryChange,
  onExcel,
  onPdf,
  onRackLocations,
  onAddStock,
}: InventoryToolbarProps) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <label className="relative min-w-[14rem] flex-1">
          <span className="sr-only">{INVENTORY_CONTENT.searchPlaceholder}</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={INVENTORY_CONTENT.searchPlaceholder}
            className="h-9 rounded-lg border-line bg-surface pl-9"
          />
        </label>
        <Button type="button" variant="outline" size="sm" onClick={onExcel} className="rounded-lg">
          <FileSpreadsheet className="size-3.5" aria-hidden />
          {INVENTORY_CONTENT.excel}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onPdf} className="rounded-lg">
          <FileDown className="size-3.5" aria-hidden />
          {INVENTORY_CONTENT.pdf}
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRackLocations}
          className="rounded-lg"
        >
          <MapPin className="size-3.5 text-brand" aria-hidden />
          {INVENTORY_CONTENT.rackLocations}
        </Button>
        <Button type="button" size="sm" onClick={onAddStock} className="rounded-lg">
          <Plus className="size-3.5" aria-hidden />
          {INVENTORY_CONTENT.addStock}
        </Button>
      </div>
    </div>
  );
}
