import {
  statusCopy,
  statusIcon,
  type DashboardDesk,
  type PageStatus,
} from '../../DashboardScreen.utils';

export type DashboardStatusBannerProps = {
  status: PageStatus;
  desk: DashboardDesk | null;
  statusId: string;
  hint?: string | null;
  onRefresh?: () => void;
  busy?: boolean;
};

export function DashboardStatusBanner({
  status,
  desk,
  statusId,
  hint,
  onRefresh,
  busy = false,
}: DashboardStatusBannerProps) {
  const text = statusCopy(status, desk, hint);
  if (!text) {
    return <div id={statusId} className="min-h-0" />;
  }
  const Icon = statusIcon(status);
  const role = status === 'denied' ? 'alert' : 'status';
  return (
    <p
      id={statusId}
      role={role}
      className="dash-status"
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span className="flex-1">{text}</span>
      {onRefresh && status !== 'loading' && status !== 'denied' ? (
        <button type="button" className="dash-chipbtn" disabled={busy} onClick={onRefresh}>
          Refresh
        </button>
      ) : null}
    </p>
  );
}
