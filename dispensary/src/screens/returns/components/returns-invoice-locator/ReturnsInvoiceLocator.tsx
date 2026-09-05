import { Button, Input } from '@atoms';
import type { FormEvent } from 'react';

export type ReturnsInvoiceLocatorProps = {
  query: string;
  busy: boolean;
  onQueryChange: (value: string) => void;
  onFind: () => void;
};

export function ReturnsInvoiceLocator({
  query,
  busy,
  onQueryChange,
  onFind,
}: ReturnsInvoiceLocatorProps) {
  function onSubmit(event: FormEvent) {
    event.preventDefault();
    onFind();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-wrap items-end gap-2 border border-line bg-surface px-3 py-3"
    >
      <div className="min-w-56 flex-1">
        <label htmlFor="return-bill" className="mb-1 block text-xs text-muted">
          Collected bill number
        </label>
        <Input
          id="return-bill"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="INV/2026-27/BR01/00012"
          autoComplete="off"
        />
      </div>
      <Button type="submit" disabled={busy}>
        Find bill
      </Button>
    </form>
  );
}
