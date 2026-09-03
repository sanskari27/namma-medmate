import { Button, Input, Label } from '@atoms';
import type { Customer } from '@/services/customers';
import { Search } from 'lucide-react';
import { FormEvent } from 'react';
import { CustomerListRow } from '../customer-list-row';

export type CustomerListPanelProps = {
  formId: string;
  customers: Customer[];
  selectedId: string | null;
  query: string;
  showEmptyHint: boolean;
  onQueryChange: (value: string) => void;
  onSearch: (event: FormEvent) => void;
  onSelect: (customer: Customer) => void;
};

export function CustomerListPanel({
  formId,
  customers,
  selectedId,
  query,
  showEmptyHint,
  onQueryChange,
  onSearch,
  onSelect,
}: CustomerListPanelProps) {
  return (
    <section
      aria-label="Customer list"
      className="flex h-full min-h-0 flex-col border border-line bg-surface"
    >
      <form className="flex items-center gap-2 border-b border-line px-3 py-2" onSubmit={onSearch}>
        <Label htmlFor={`${formId}-search`} className="sr-only">
          Search customers
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
            placeholder="Name or phone"
            className="h-9 pl-8"
          />
        </div>
        <Button type="submit" variant="outline" className="shrink-0">
          Search
        </Button>
      </form>

      <ul className="panel-scroll min-h-0 flex-1 divide-y divide-line overflow-y-auto">
        {customers.map((customer) => (
          <CustomerListRow
            key={customer.id}
            customer={customer}
            active={selectedId === customer.id}
            nameId={`${formId}-row-${customer.id}-name`}
            metaId={`${formId}-row-${customer.id}-meta`}
            onSelect={onSelect}
          />
        ))}
      </ul>

      {showEmptyHint ? (
        <p className="border-t border-line px-3 py-6 text-sm text-muted">
          No matching customers on this floor.
        </p>
      ) : null}
    </section>
  );
}
