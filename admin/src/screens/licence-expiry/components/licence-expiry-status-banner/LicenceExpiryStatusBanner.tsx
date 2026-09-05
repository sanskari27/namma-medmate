import { statusCopy, type PageStatus } from '../../LicenceExpiryScreen.utils';

export type LicenceExpiryStatusBannerProps = {
  status: PageStatus;
  statusId: string;
};

export function LicenceExpiryStatusBanner({ status, statusId }: LicenceExpiryStatusBannerProps) {
  const copy = statusCopy(status);
  if (!copy) {
    return <div id={statusId} className="min-h-5" />;
  }
  return (
    <p
      id={statusId}
      role={status === 'success' || status === 'loading' || status === 'empty' ? 'status' : 'alert'}
      className="flex items-start gap-2 border border-line bg-elevated px-3 py-2 text-sm text-ink"
    >
      <copy.icon className="mt-0.5 size-3.5 shrink-0 text-brand" aria-hidden="true" />
      <span>{copy.text}</span>
    </p>
  );
}
