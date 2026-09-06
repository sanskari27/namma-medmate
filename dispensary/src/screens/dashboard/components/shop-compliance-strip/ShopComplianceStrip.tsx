import type { CompliancePayload, DashboardWidget } from '@/services/dashboards';
import { formatDay } from '../../DashboardScreen.utils';
import { ShopWidgetFrame } from '../shop-widget-frame';

export type ShopComplianceStripProps = {
  widget?: DashboardWidget<CompliancePayload> | null;
};

export function ShopComplianceStrip({ widget }: ShopComplianceStripProps) {
  const data = widget?.data;
  const licences = data?.licenses ?? [];
  return (
    <ShopWidgetFrame
      title="Licences and KYC"
      asOf={widget?.asOf}
      status={widget?.status}
      href={widget?.href ?? '/licenses'}
      linkLabel="Licences"
    >
      {data ? (
        <dl className="mt-2 space-y-1 text-sm text-muted">
          <div className="flex justify-between gap-3">
            <dt>Pharmacy</dt>
            <dd className="font-mono text-ink">{data.tenantStatus}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>KYC</dt>
            <dd className="font-mono text-ink">{data.kycStatus}</dd>
          </div>
        </dl>
      ) : (
        <p className="mt-2 text-sm text-muted">No licence file in this view.</p>
      )}
      {licences.length === 0 ? (
        <p className="mt-2 text-sm text-muted">No licences due in the alert window.</p>
      ) : (
        <ul className="mt-2 space-y-1 text-sm">
          {licences.map((row) => (
            <li key={row.id} className="flex justify-between gap-3 text-ink">
              <span>{row.docType.replace(/_/g, ' ')}</span>
              <span className="font-mono text-muted">{formatDay(row.expiresOn)}</span>
            </li>
          ))}
        </ul>
      )}
    </ShopWidgetFrame>
  );
}
