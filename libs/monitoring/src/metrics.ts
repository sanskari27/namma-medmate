export interface MetricPoint {
  name: string;
  value: number;
  unit: 'Count' | 'Milliseconds';
}

const points: MetricPoint[] = [];

export function recordMetric(point: MetricPoint): void {
  points.push(point);
}

export function getRecordedMetrics(): readonly MetricPoint[] {
  return points;
}

export function resetMetrics(): void {
  points.length = 0;
}
