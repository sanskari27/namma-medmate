import {
  statusCopy,
  statusIcon,
  type PageStatus,
  type SpendState,
} from '../../ExpensesScreen.utils';

export type ExpensesStatusBannerProps = {
  status: PageStatus;
  statusId: string;
  hint?: string | null;
  spendState?: SpendState;
};

export function ExpensesStatusBanner({
  status,
  statusId,
  hint,
  spendState = 'POSTED',
}: ExpensesStatusBannerProps) {
  const text = statusCopy(status, hint, spendState);
  if (!text) {
    return <div id={statusId} className="min-h-5" />;
  }
  const Icon = statusIcon(status);
  const role = status === 'denied' ? 'alert' : 'status';
  return (
    <p
      id={statusId}
      role={role}
      className="flex items-start gap-2 border border-line bg-surface px-3 py-2 text-sm text-ink"
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{text}</span>
    </p>
  );
}
