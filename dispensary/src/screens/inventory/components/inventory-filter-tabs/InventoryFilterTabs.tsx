import { INVENTORY_CONTENT, type InventoryFilter } from '../../InventoryScreen.content';

type InventoryFilterTabsProps = {
  filter: InventoryFilter;
  alertCount: number;
  onChange: (filter: InventoryFilter) => void;
};

const FILTERS: InventoryFilter[] = [
  'all',
  'alerts',
  'low',
  'expiring',
  'rx',
  'out',
  'unallocated',
];

export function InventoryFilterTabs({ filter, alertCount, onChange }: InventoryFilterTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Inventory filters"
      className="flex flex-wrap items-center gap-1 border-b border-line"
    >
      {FILTERS.map((key) => {
        const active = filter === key;
        const label =
          key === 'alerts'
            ? `${INVENTORY_CONTENT.filters.alerts} · ${alertCount}`
            : INVENTORY_CONTENT.filters[key];
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(key)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm transition-colors ${
              active
                ? 'border-ink font-semibold text-ink'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
