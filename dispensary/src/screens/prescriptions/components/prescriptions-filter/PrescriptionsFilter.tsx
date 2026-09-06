import type { RxFilter } from '../../PrescriptionsScreen.utils';
import { filterLabel } from '../../PrescriptionsScreen.utils';

export type PrescriptionsFilterProps = {
  filter: RxFilter;
  onChange: (filter: RxFilter) => void;
  disabled?: boolean;
};

const OPTIONS: RxFilter[] = ['ACTIVE', 'ARCHIVED'];

export function PrescriptionsFilter({
  filter,
  onChange,
  disabled = false,
}: PrescriptionsFilterProps) {
  return (
    <div role="tablist" aria-label="Rx status" className="flex gap-1">
      {OPTIONS.map((option) => {
        const selected = option === filter;
        return (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={selected}
            disabled={disabled}
            className={`border px-3 py-1.5 text-sm ${
              selected
                ? 'border-brand bg-brand-soft font-medium text-ink'
                : 'border-line bg-surface text-muted'
            }`}
            onClick={() => onChange(option)}
          >
            {filterLabel(option)}
          </button>
        );
      })}
    </div>
  );
}
