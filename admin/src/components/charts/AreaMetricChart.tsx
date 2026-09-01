import { lazy, Suspense } from 'react';
import type { MetricPoint } from './chart-types';

export type { MetricPoint };

const LiveAreaChart = lazy(() => import('./LiveAreaChart'));

type AreaMetricChartProps = {
  data: MetricPoint[];
  emptyLabel: string;
};

export function AreaMetricChart({ data, emptyLabel }: AreaMetricChartProps) {
  if (data.length === 0) {
    return (
      <p role="status" className="border border-dashed border-line bg-canvas px-4 py-8 text-sm text-muted">
        {emptyLabel}
      </p>
    );
  }

  return (
    <Suspense
      fallback={
        <p role="status" className="border border-dashed border-line bg-canvas px-4 py-8 text-sm text-muted">
          Loading chart
        </p>
      }
    >
      <LiveAreaChart data={data} />
    </Suspense>
  );
}
