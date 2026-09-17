import { Button, Input } from '@atoms';
import { ROUTES } from '@/libs/constants/routes.const';
import { FileDown, FileSpreadsheet, MapPin, Plus, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { INVENTORY_CONTENT } from '../../InventoryScreen.content';

type InventoryToolbarProps = {
  query: string;
  onQueryChange: (value: string) => void;
  onExcel: () => void;
  onPdf: () => void;
  onRackLocations: () => void;
  onAddProduct: () => void;
  onReceive?: () => void;
};

export function InventoryToolbar({
  query,
  onQueryChange,
  onExcel,
  onPdf,
  onRackLocations,
  onAddProduct,
  onReceive,
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
        {onReceive ? (
          <Button type="button" variant="outline" size="sm" onClick={onReceive} className="rounded-lg">
            {INVENTORY_CONTENT.receiveStock}
          </Button>
        ) : null}
        <Button type="button" size="sm" onClick={onAddProduct} className="rounded-lg">
          <Plus className="size-3.5" aria-hidden />
          {INVENTORY_CONTENT.addProduct}
        </Button>
        <Button asChild variant="ghost" size="sm" className="rounded-lg">
          <Link to={ROUTES.PURCHASES}>{INVENTORY_CONTENT.addStock}</Link>
        </Button>
      </div>
    </div>
  );
}
