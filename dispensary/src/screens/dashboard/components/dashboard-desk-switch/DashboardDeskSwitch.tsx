import { DASHBOARD_CONTENT } from '../../DashboardScreen.content';
import { DESK_LABEL, type DashboardDesk } from '../../DashboardScreen.utils';

export type DashboardDeskSwitchProps = {
  desks: DashboardDesk[];
  current: DashboardDesk | null;
  onSelect: (desk: DashboardDesk) => void;
  busy?: boolean;
};

export function DashboardDeskSwitch({
  desks,
  current,
  onSelect,
  busy = false,
}: DashboardDeskSwitchProps) {
  if (desks.length < 2) {
    return null;
  }
  return (
    <div className="dash-seg dash-desks" role="tablist" aria-label={DASHBOARD_CONTENT.deskSwitchAria}>
      {desks.map((desk) => (
        <button
          key={desk}
          type="button"
          role="tab"
          aria-selected={current === desk}
          className={current === desk ? 'on' : undefined}
          disabled={busy}
          onClick={() => onSelect(desk)}
        >
          {DESK_LABEL[desk]}
        </button>
      ))}
    </div>
  );
}
