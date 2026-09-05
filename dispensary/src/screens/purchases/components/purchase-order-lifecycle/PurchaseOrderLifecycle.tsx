import { Button } from '@atoms';
import type { PurchaseOrderStatus } from '@/services/purchaseOrders';
import { statusLabel } from '../../PurchasesScreen.utils';

export type PurchaseOrderLifecycleProps = {
  status: PurchaseOrderStatus;
  busy: boolean;
  onIssue: () => void;
  onClose: () => void;
  onCancel: () => void;
};

export function PurchaseOrderLifecycle({
  status,
  busy,
  onIssue,
  onClose,
  onCancel,
}: PurchaseOrderLifecycleProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <p className="mr-auto text-sm text-muted">
        Status on this outlet: <span className="font-medium text-ink">{statusLabel(status)}</span>
      </p>
      {status === 'DRAFT' ? (
        <Button type="button" disabled={busy} onClick={onIssue}>
          Issue to stockist
        </Button>
      ) : null}
      {status === 'ISSUED' ? (
        <Button type="button" disabled={busy} onClick={onClose}>
          Close indent
        </Button>
      ) : null}
      {status === 'DRAFT' || status === 'ISSUED' ? (
        <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>
          Cancel indent
        </Button>
      ) : null}
    </div>
  );
}
