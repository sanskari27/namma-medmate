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
  const tone = status === 'success' ? 'success' : status === 'denied' || status === 'failure' || status === 'conflict' || status === 'validation' ? 'alert' : 'neutral';
  return (
    <p id={statusId} role={role} className="pos-banner" data-tone={tone}>
      {copy}
    </p>
  );
}
