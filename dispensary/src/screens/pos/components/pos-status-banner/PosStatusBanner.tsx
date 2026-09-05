import { statusCopy, type PageStatus } from '../../PosScreen.utils';

interface PosStatusBannerProps {
  status: PageStatus;
  statusId: string;
  invoiceNumber?: string | null;
  hint?: string | null;
}

export function PosStatusBanner({ status, statusId, invoiceNumber, hint }: PosStatusBannerProps) {
  const copy = statusCopy(status, invoiceNumber, hint);
  if (!copy) {
    return <div id={statusId} className="min-h-5" aria-live="polite" />;
  }
  const role =
    status === 'success' || status === 'loading' || status === 'empty' ? 'status' : 'alert';
  return (
    <p
      id={statusId}
      role={role}
      className={
        status === 'success'
          ? 'rounded border border-brand/30 bg-brand-soft px-3 py-2 text-sm text-ink'
          : 'rounded border border-line bg-surface px-3 py-2 text-sm text-ink'
      }
    >
      {copy}
    </p>
  );
}
