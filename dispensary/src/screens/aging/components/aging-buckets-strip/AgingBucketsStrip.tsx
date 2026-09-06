import type { AgingReport } from '@/services/aging';
import { bucketLabel, formatPaise } from '../../AgingScreen.utils';

export type AgingBucketsStripProps = {
  receivables: AgingReport;
  payables: AgingReport;
  allOutlets: boolean;
};

export function AgingBucketsStrip({ receivables, payables, allOutlets }: AgingBucketsStripProps) {
  const outlet = allOutlets ? 'All outlets' : 'This outlet';
  return (
    <section aria-label="Aging buckets" className="overflow-x-auto border border-line bg-surface">
      <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
        <caption className="sr-only">
          {outlet}: patients owe {formatPaise(receivables.totalPaise)}, we owe stockists{' '}
          {formatPaise(payables.totalPaise)}
        </caption>
        <thead>
          <tr className="border-b border-line text-xs text-muted">
            <th className="px-3 py-2 font-medium">{outlet}</th>
            {receivables.buckets.map((bucket) => (
              <th key={bucket.key} className="px-3 py-2 font-medium font-mono">
                {bucketLabel(bucket.key, bucket.label)}
              </th>
            ))}
            <th className="px-3 py-2 font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-line">
            <th scope="row" className="px-3 py-2 font-medium text-ink">
              Patients owe us
            </th>
            {receivables.buckets.map((bucket) => (
              <td key={bucket.key} className="px-3 py-2 font-mono text-ink">
                {formatPaise(bucket.totalPaise)}
              </td>
            ))}
            <td className="px-3 py-2 font-mono font-medium text-ink">
              {formatPaise(receivables.totalPaise)}
            </td>
          </tr>
          <tr>
            <th scope="row" className="px-3 py-2 font-medium text-ink">
              We owe stockists
            </th>
            {payables.buckets.map((bucket) => (
              <td key={bucket.key} className="px-3 py-2 font-mono text-ink">
                {formatPaise(bucket.totalPaise)}
              </td>
            ))}
            <td className="px-3 py-2 font-mono font-medium text-ink">
              {formatPaise(payables.totalPaise)}
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}
