import { Button, Input, Label } from '@atoms';
import type { Supplier } from '@/services/suppliers';
import { Search } from 'lucide-react';
import { FormEvent } from 'react';
import { DistributorListRow } from '../distributor-list-row';

export type DistributorListPanelProps = {
  formId: string;
  suppliers: Supplier[];
  selectedId: string | null;
  query: string;
  showEmptyHint: boolean;
  onQueryChange: (value: string) => void;
  onSearch: (event: FormEvent) => void;
  onSelect: (supplier: Supplier) => void;
};

export function DistributorListPanel({
  formId,
  suppliers,
  selectedId,
  query,
  showEmptyHint,
  onQueryChange,
  onSearch,
  onSelect,
}: DistributorListPanelProps) {
  return (
    <section
      aria-label="Supplier list"
      className="flex h-full min-h-0 flex-col border border-line bg-surface"
    >
      <form className="flex items-center gap-2 border-b border-line px-3 py-2" onSubmit={onSearch}>
        <Label htmlFor={`${formId}-search`} className="sr-only">
          Search suppliers
        </Label>
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <Input
            id={`${formId}-search`}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Code, name, GSTIN, or phone"
            className="h-9 pl-8 font-mono text-sm"
          />
        </div>
        <Button type="submit" variant="outline" className="shrink-0">
          Search
        </Button>
      </form>

      <ul className="panel-scroll min-h-0 flex-1 divide-y divide-line overflow-y-auto">
        {suppliers.map((supplier) => (
          <DistributorListRow
            key={supplier.id}
            supplier={supplier}
            active={selectedId === supplier.id}
            nameId={`${formId}-row-${supplier.id}-name`}
            metaId={`${formId}-row-${supplier.id}-meta`}
            onSelect={onSelect}
          />
        ))}
      </ul>

      {showEmptyHint ? (
        <p className="border-t border-line px-3 py-6 text-sm text-muted">
          No matching stockists on this book.
        </p>
      ) : null}
    </section>
  );
}
