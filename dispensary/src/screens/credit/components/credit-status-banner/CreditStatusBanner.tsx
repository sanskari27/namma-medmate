import { AlertCircle, BadgeCheck, Wallet } from 'lucide-react';
import { statusCopy, type PageStatus } from '../../CreditScreen.utils';

export type CreditStatusBannerProps = {
  status: PageStatus;
  statusId: string;
};

export function CreditStatusBanner({ status, statusId }: CreditStatusBannerProps) {
  const text = statusCopy(status);
  if (!text) {
    return <div id={statusId} className="min-h-10" aria-live="polite" />;
  }
  const alert = status === 'denied' || status === 'conflict' || status === 'failure';
  const Icon =
    status === 'success' ? BadgeCheck : status === 'loading' || status === 'empty' ? Wallet : AlertCircle;
  return (
    <div
      id={statusId}
      role={alert ? 'alert' : 'status'}
      className="flex min-h-10 items-start gap-2 border border-line bg-brand-soft/40 px-3 py-2 text-sm text-ink"
    >
      <Icon className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
      <p>{text}</p>
    </div>
  );
}
