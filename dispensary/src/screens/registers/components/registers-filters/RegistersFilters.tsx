import { Button, Input, Label } from '@atoms';
import type { FilterState } from '../../RegistersScreen.utils';

export type RegistersFiltersProps = {
  filters: FilterState;
  showBatch: boolean;
  disabled?: boolean;
  onChange: (next: FilterState) => void;
  onApply: () => void;
};

export function RegistersFilters({
  filters,
  showBatch,
  disabled = false,
  onChange,
  onApply,
}: RegistersFiltersProps) {
  return (
    <form
      className="flex flex-wrap items-end gap-3 border border-line bg-surface p-3"
      aria-label="Register book filters"
      onSubmit={(event) => {
        event.preventDefault();
        onApply();
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="register-from">From</Label>
        <Input
          id="register-from"
          type="date"
          value={filters.from}
          disabled={disabled}
          onChange={(event) => onChange({ ...filters, from: event.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="register-to">To</Label>
        <Input
          id="register-to"
          type="date"
          value={filters.to}
          disabled={disabled}
          onChange={(event) => onChange({ ...filters, to: event.target.value })}
        />
      </div>
      {showBatch ? (
        <div className="space-y-1.5">
          <Label htmlFor="register-batch">Batch</Label>
          <Input
            id="register-batch"
            value={filters.batchNumber}
            disabled={disabled}
            onChange={(event) => onChange({ ...filters, batchNumber: event.target.value })}
          />
        </div>
      ) : null}
      <Button type="submit" variant="outline" disabled={disabled}>
        Apply filters
      </Button>
    </form>
  );
}
