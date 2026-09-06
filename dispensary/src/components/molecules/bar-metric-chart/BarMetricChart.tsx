import type { MetricPoint } from '@molecules/area-metric-chart/chart-types';
import { lazy, Suspense } from 'react';

export type { MetricPoint };

const LiveBarChart = lazy(() => import('@molecules/live-bar-chart/LiveBarChart'));

type BarMetricChartProps = {
  data: MetricPoint[];
  emptyLabel: string;
};

export function BarMetricChart({ data, emptyLabel }: BarMetricChartProps) {
  if (data.length === 0 || data.every((point) => point.value === 0)) {
    return (
      <p
        role="status"
        className="border border-dashed border-line bg-canvas px-4 py-8 text-sm text-muted"
      >
        {emptyLabel}
      </p>
    );
  }

  return (
    <Suspense
      fallback={
        <p
          role="status"
          className="border border-dashed border-line bg-canvas px-4 py-8 text-sm text-muted"
        >
          Loading chart
        </p>
      }
    >
      <LiveBarChart data={data} />
    </Suspense>
  );
}
