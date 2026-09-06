import { Button, Input, Label } from '@atoms';
import type { FilterState, OutletScope } from '../../CaPackScreen.utils';

export type CaPackFilterBarProps = {
  filters: FilterState;
  owner: boolean;
  scope: OutletScope;
  disabled?: boolean;
  onChange: (next: FilterState) => void;
  onScope: (value: OutletScope) => void;
  onApply: () => void;
};

export function CaPackFilterBar({
  filters,
  owner,
  scope,
  disabled = false,
  onChange,
  onScope,
  onApply,
}: CaPackFilterBarProps) {
  return (
    <form
      className="flex flex-wrap items-end gap-3 border border-line bg-surface p-3"
      aria-label="CA pack period"
      onSubmit={(event) => {
        event.preventDefault();
        onApply();
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="ca-pack-from">From</Label>
        <Input
          id="ca-pack-from"
          type="date"
          value={filters.from}
          disabled={disabled}
          onChange={(event) => onChange({ ...filters, from: event.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ca-pack-to">To</Label>
        <Input
          id="ca-pack-to"
          type="date"
          value={filters.to}
          disabled={disabled}
          onChange={(event) => onChange({ ...filters, to: event.target.value })}
        />
      </div>
      {owner ? (
        <div className="space-y-1.5">
          <Label htmlFor="ca-pack-outlet">Outlet</Label>
          <select
            id="ca-pack-outlet"
            className="h-10 w-full min-w-36 rounded-md border border-line bg-surface px-3 text-sm text-ink"
            value={scope}
            disabled={disabled}
            onChange={(event) => onScope(event.target.value as OutletScope)}
          >
            <option value="session">This outlet</option>
            <option value="tenant">All outlets</option>
          </select>
        </div>
      ) : null}
      <Button type="submit" variant="outline" disabled={disabled}>
        Show this pack
      </Button>
    </form>
  );
}
