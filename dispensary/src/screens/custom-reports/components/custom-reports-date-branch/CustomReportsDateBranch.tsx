import { Button, Input, Label } from '@atoms';
import type { Ref } from 'react';
import type { OutletScope } from '../../CustomReportsScreen.utils';

export type CustomReportsDateBranchProps = {
  from: string;
  to: string;
  owner: boolean;
  scope: OutletScope;
  disabled?: boolean;
  applyRef?: Ref<HTMLButtonElement>;
  onFrom: (value: string) => void;
  onTo: (value: string) => void;
  onScope: (value: OutletScope) => void;
  onApply: () => void;
};

export function CustomReportsDateBranch({
  from,
  to,
  owner,
  scope,
  disabled = false,
  applyRef,
  onFrom,
  onTo,
  onScope,
  onApply,
}: CustomReportsDateBranchProps) {
  return (
    <form
      className="flex flex-wrap items-end gap-3 border border-line bg-surface p-3"
      aria-label="Dates and outlet"
      onSubmit={(event) => {
        event.preventDefault();
        onApply();
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="custom-report-from">From</Label>
        <Input
          id="custom-report-from"
          type="date"
          value={from}
          disabled={disabled}
          onChange={(event) => onFrom(event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="custom-report-to">To</Label>
        <Input
          id="custom-report-to"
          type="date"
          value={to}
          disabled={disabled}
          onChange={(event) => onTo(event.target.value)}
        />
      </div>
      {owner ? (
        <div className="space-y-1.5">
          <Label htmlFor="custom-report-outlet">Outlet</Label>
          <select
            id="custom-report-outlet"
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
      <Button ref={applyRef} type="submit" variant="outline" disabled={disabled}>
        Show rows
      </Button>
    </form>
  );
}
