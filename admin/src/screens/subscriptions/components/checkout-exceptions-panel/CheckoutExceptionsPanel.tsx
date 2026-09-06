import { Button } from '@atoms';
import type { AdminCashfreePayment } from '@/services/subscriptions';
import type { RefObject } from 'react';
import {
  formatIstStamp,
  formatPaise,
  paymentCopy,
  paymentStatusLabel,
  type PayStatus,
} from '../../SubscriptionsScreen.utils';

export function CheckoutExceptionsPanel({
  payStatus,
  items,
  busy,
  refreshRef,
  onRefresh,
}: {
  payStatus: PayStatus;
  items: AdminCashfreePayment[];
  busy: boolean;
  refreshRef: RefObject<HTMLButtonElement | null>;
  onRefresh: () => void;
}) {
  const banner = paymentCopy(payStatus);
  const exceptions = items.filter((row) => row.exception);

  return (
    <section aria-labelledby="charges-heading" className="space-y-3 border-t border-line pt-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="charges-heading" className="font-serif text-lg text-ink">
            Pharmacy-to-platform charges
          </h2>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Cashfree collections from pharmacies onto this platform. Failed, abandoned, and aged
            open checkouts are checkout exceptions — MASTER override stays a non-payment path.
          </p>
        </div>
        <Button
          ref={refreshRef}
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={onRefresh}
        >
          {busy ? 'Refreshing…' : 'Refresh charges'}
        </Button>
      </div>

      {banner ? (
        <p
          role={payStatus === 'loading' || payStatus === 'empty' ? 'status' : 'alert'}
          className="border border-line bg-elevated px-3 py-2 text-sm text-ink"
        >
          {banner.text}
        </p>
      ) : null}

      {exceptions.length > 0 ? (
        <h3 className="font-serif text-base text-ink">Checkout exceptions</h3>
      ) : null}

      {items.length > 0 ? (
        <div className="overflow-x-auto border border-line">
          <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
            <caption className="sr-only">Pharmacy-to-platform Cashfree charges</caption>
            <thead className="border-b border-line bg-elevated text-[11px] text-muted">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">
                  Tenant
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Plan
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Amount
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  State
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Flag
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Filed (IST)
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-b border-line last:border-b-0">
                  <td className="px-3 py-3 text-ink">{row.tenantName}</td>
                  <td className="px-3 py-3 font-mono text-[11px] text-brand">{row.planCode}</td>
                  <td className="px-3 py-3 font-mono text-[11px] text-ink">
                    {formatPaise(row.amountPaise)}
                  </td>
                  <td className="px-3 py-3 font-mono text-[11px] text-muted">
                    {paymentStatusLabel(row.status)}
                  </td>
                  <td className="px-3 py-3">
                    {row.exception ? (
                      <span className="font-mono text-[11px] text-warn">Checkout exception</span>
                    ) : (
                      <span className="font-mono text-[11px] text-muted">On file</span>
                    )}
                    {row.errorCode ? (
                      <p className="font-mono text-[11px] text-muted">{row.errorCode}</p>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 font-mono text-[11px] text-muted">
                    {formatIstStamp(row.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
