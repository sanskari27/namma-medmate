import { Button, Input, Label } from '@atoms';
import type { Customer } from '@/services/customers';

interface PosCustomerPickerProps {
  query: string;
  onQueryChange: (value: string) => void;
  customers: Customer[];
  selected: Customer | null;
  onSelect: (customer: Customer) => void;
  onClear: () => void;
  busy: boolean;
}

export function PosCustomerPicker({
  query,
  onQueryChange,
  customers,
  selected,
  onSelect,
  onClear,
  busy,
}: PosCustomerPickerProps) {
  return (
    <section className="space-y-3 rounded border border-line bg-surface p-3" aria-label="Customer">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-ink">Linked customer</h2>
          <p className="text-xs text-muted">Required before completing a draft with medicines.</p>
        </div>
        {selected ? (
          <Button type="button" variant="ghost" size="sm" onClick={onClear} disabled={busy}>
            Clear
          </Button>
        ) : null}
      </div>
      {selected ? (
        <div className="rounded border border-brand/20 bg-brand-soft/40 px-3 py-2 text-sm text-ink">
          <p className="font-medium">{selected.name}</p>
          <p className="font-mono text-xs text-muted">{selected.phone}</p>
          {selected.allergies ? (
            <p className="mt-1 text-xs text-warn">Allergies on file: {selected.allergies}</p>
          ) : (
            <p className="mt-1 text-xs text-muted">No allergies recorded.</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="pos-customer-search">Search customer</Label>
          <Input
            id="pos-customer-search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Name or phone"
            disabled={busy}
          />
          <ul className="max-h-40 space-y-1 overflow-auto">
            {customers.map((customer) => (
              <li key={customer.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded border border-transparent px-2 py-1.5 text-left text-sm hover:border-line hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  onClick={() => onSelect(customer)}
                >
                  <span className="font-medium text-ink">{customer.name}</span>
                  <span className="font-mono text-xs text-muted">{customer.phone}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
