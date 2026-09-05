import { discountApprovalCopy } from '../../PosScreen.utils';
import type { DiscountApprovalStatus } from '@/services/salesInvoices';

interface PosDiscountApprovalProps {
  status: DiscountApprovalStatus | null | undefined;
}

export function PosDiscountApproval({ status }: PosDiscountApprovalProps) {
  const copy = discountApprovalCopy(status);
  if (!copy) {
    return null;
  }
  const pending = status === 'PENDING' || status === 'REJECTED';
  return (
    <p
      role={pending ? 'alert' : 'status'}
      className="rounded border border-line bg-surface px-3 py-2 text-sm text-ink"
    >
      {copy}
    </p>
  );
}
