import { AGING_CONTENT } from '../../AgingScreen.content';
import { BUCKET_LABELS, formatPaise, type AgingBucketKey } from '../../AgingScreen.utils';
import type { AgingReport } from '@/services/aging';

export function AgingBucketsStrip({ report }: { report: AgingReport }) {
  return (
    <ul className="ag-buckets" aria-label={AGING_CONTENT.bucketsLabel}>
      {report.buckets.map((bucket) => (
        <li key={bucket.key}>
          <span>{BUCKET_LABELS[bucket.key as AgingBucketKey] ?? bucket.label}</span>
          <strong>{formatPaise(bucket.totalPaise)}</strong>
        </li>
      ))}
    </ul>
  );
}
