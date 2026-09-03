import { AlertCircle } from 'lucide-react';
import type { PageStatus } from '../../CustomersScreen.utils';
import { statusCopy, statusIconClass } from '../../CustomersScreen.utils';

export type CustomersStatusBannerProps = {
  status: PageStatus;
  statusId: string;
  asAlert?: boolean;
};

export function CustomersStatusBanner({
  status,
  statusId,
  asAlert = false,
}: CustomersStatusBannerProps) {
  const banner = statusCopy(status);
  if (!banner) {
    return null;
  }

  if (asAlert) {
    return (
      <p
        role="alert"
        className="flex items-start gap-2 border border-line bg-surface px-3 py-2 text-sm text-danger"
      >
        <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
        {banner.text}
      </p>
    );
  }

  return (
    <p
      id={statusId}
      role="status"
      aria-live="polite"
      className="flex items-start gap-2 border border-line bg-surface px-3 py-2 text-sm text-ink"
    >
      <banner.icon className={`mt-0.5 size-4 shrink-0 ${statusIconClass(status)}`} aria-hidden />
      <span>{banner.text}</span>
    </p>
  );
}
