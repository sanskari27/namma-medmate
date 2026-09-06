import { Label } from '@atoms';
import type { OutletScope } from '../../DashboardScreen.utils';

export type DashboardOutletFilterProps = {
  scope: OutletScope;
  disabled?: boolean;
  onScope: (scope: OutletScope) => void;
};

export function DashboardOutletFilter({
  scope,
  disabled = false,
  onScope,
}: DashboardOutletFilterProps) {
  return (
    <div className="flex flex-wrap items-end gap-3 border border-line bg-surface px-3 py-2">
      <div className="space-y-1">
        <Label htmlFor="dashboard-outlet">Outlet</Label>
        <select
          id="dashboard-outlet"
          className="h-10 w-full min-w-48 rounded-md border border-line bg-surface px-3 text-sm text-ink"
          value={scope}
          disabled={disabled}
          onChange={(event) => onScope(event.target.value as OutletScope)}
        >
          <option value="session">This outlet</option>
          <option value="tenant">All outlets</option>
        </select>
      </div>
    </div>
  );
}
