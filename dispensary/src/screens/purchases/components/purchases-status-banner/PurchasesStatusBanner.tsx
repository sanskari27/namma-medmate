import { AlertCircle } from 'lucide-react';
import type { PageStatus } from '../../PurchasesScreen.utils';
import { statusCopy, statusIconClass } from '../../PurchasesScreen.utils';

export type PurchasesStatusBannerProps = {
  status: PageStatus;
  statusId: string;
  asAlert?: boolean;
};

export function PurchasesStatusBanner({
  status,
  statusId,
  asAlert = false,
}: PurchasesStatusBannerProps) {
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
