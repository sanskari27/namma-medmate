import { Button } from '@atoms';
import { statusCopy, type PageStatus } from '../../WaitlistScreen.utils';

export function WaitlistStatus({
  statusId,
  status,
  onRetry,
}: {
  statusId: string;
  status: PageStatus;
  onRetry: () => void;
}) {
  const copy = statusCopy(status);
  if (!copy) {
    return null;
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      <p
        id={statusId}
        role="status"
        className="flex items-center gap-2 border border-line bg-elevated px-3 py-2 text-sm text-ink"
      >
        <copy.icon className="size-4 shrink-0" aria-hidden />
        {copy.text}
      </p>
      {status === 'failure' ? (
        <Button type="button" variant="outline" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
