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
};

export function DashboardStatusBanner({
  status,
  desk,
  statusId,
  hint,
}: DashboardStatusBannerProps) {
  const text = statusCopy(status, desk, hint);
  if (!text) {
    return <div id={statusId} className="min-h-10" />;
  }
  const Icon = statusIcon(status);
  const role = status === 'denied' ? 'alert' : 'status';
  return (
    <p
      id={statusId}
      role={role}
      className="flex min-h-10 items-start gap-2 border border-line bg-surface px-3 py-2 text-sm text-ink"
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{text}</span>
    </p>
  );
}
