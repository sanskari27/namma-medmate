import { DESK_LABEL, type DashboardDesk } from '../../DashboardScreen.utils';

export type DashboardDeskSwitchProps = {
  desks: DashboardDesk[];
  selected: DashboardDesk;
  disabled?: boolean;
  onSelect: (desk: DashboardDesk) => void;
};

export function DashboardDeskSwitch({
  desks,
  selected,
  disabled = false,
  onSelect,
}: DashboardDeskSwitchProps) {
  if (desks.length < 2) {
    return null;
  }
  return (
    <nav aria-label="Desk" className="flex flex-wrap gap-1 border border-line bg-surface p-1">
      {desks.map((desk) => {
        const current = desk === selected;
        return (
          <button
            key={desk}
            type="button"
            disabled={disabled}
            aria-pressed={current}
            className={
              current
                ? 'h-8 px-3 text-sm font-medium bg-brand text-surface'
                : 'h-8 px-3 text-sm text-ink hover:bg-brand-soft'
            }
            onClick={() => onSelect(desk)}
          >
            {DESK_LABEL[desk]}
          </button>
        );
      })}
    </nav>
  );
}
