import { Button, Input, Label } from '@atoms';
import type { Ref } from 'react';
import type { OutletScope } from '../../AgingScreen.utils';

export type AgingFilterBarProps = {
  asOf: string;
  owner: boolean;
  scope: OutletScope;
  applyRef?: Ref<HTMLButtonElement>;
  onAsOf: (value: string) => void;
  onScope: (value: OutletScope) => void;
  onApply: () => void;
};

export function AgingFilterBar({
  asOf,
  owner,
  scope,
  applyRef,
  onAsOf,
  onScope,
  onApply,
}: AgingFilterBarProps) {
  return (
    <form
      className="grid gap-3 border border-line bg-surface px-3 py-2 sm:grid-cols-2 lg:grid-cols-4"
      onSubmit={(event) => {
        event.preventDefault();
        onApply();
      }}
    >
      <div className="space-y-1">
        <Label htmlFor="aging-as-of">As of</Label>
        <Input
          id="aging-as-of"
          type="date"
          value={asOf}
          onChange={(event) => onAsOf(event.target.value)}
        />
      </div>
      {owner ? (
        <div className="space-y-1">
          <Label htmlFor="aging-outlet">Outlet</Label>
          <select
            id="aging-outlet"
            className="h-10 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink"
            value={scope}
            onChange={(event) => onScope(event.target.value as OutletScope)}
          >
            <option value="session">This outlet</option>
            <option value="tenant">All outlets</option>
          </select>
        </div>
      ) : null}
      <div className="flex items-end">
        <Button ref={applyRef} type="submit">
          Apply date
        </Button>
      </div>
    </form>
  );
}
