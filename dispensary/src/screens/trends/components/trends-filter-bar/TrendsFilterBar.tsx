import { Button, Label } from '@atoms';
import type { Ref } from 'react';
import type { CompareKind, OutletScope } from '../../TrendsScreen.utils';

export type TrendsFilterBarProps = {
  compare: CompareKind;
  owner: boolean;
  scope: OutletScope;
  disabled?: boolean;
  applyRef?: Ref<HTMLButtonElement>;
  onCompare: (value: CompareKind) => void;
  onScope: (value: OutletScope) => void;
  onApply: () => void;
};

export function TrendsFilterBar({
  compare,
  owner,
  scope,
  disabled = false,
  applyRef,
  onCompare,
  onScope,
  onApply,
}: TrendsFilterBarProps) {
  return (
    <form
      className="flex flex-wrap items-end gap-3 border border-line bg-surface p-3"
      aria-label="Compare window"
      onSubmit={(event) => {
        event.preventDefault();
        onApply();
      }}
    >
      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium text-ink">Window</legend>
        <div className="flex flex-wrap gap-3 text-sm text-ink">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="compare-window"
              value="WOW"
              checked={compare === 'WOW'}
              disabled={disabled}
              onChange={() => onCompare('WOW')}
            />
            This week vs last week
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="compare-window"
              value="MOM"
              checked={compare === 'MOM'}
              disabled={disabled}
              onChange={() => onCompare('MOM')}
            />
            This month vs last month
          </label>
        </div>
      </fieldset>
      {owner ? (
        <div className="space-y-1.5">
          <Label htmlFor="compare-outlet">Outlet</Label>
          <select
            id="compare-outlet"
            className="h-10 min-w-36 rounded-md border border-line bg-surface px-3 text-sm text-ink"
            value={scope}
            disabled={disabled}
            onChange={(event) => onScope(event.target.value as OutletScope)}
          >
            <option value="session">This outlet</option>
            <option value="tenant">All outlets</option>
          </select>
        </div>
      ) : null}
      <Button ref={applyRef} type="submit" disabled={disabled}>
        Show this window
      </Button>
    </form>
  );
}
