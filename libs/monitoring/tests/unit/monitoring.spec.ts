import { describe, expect, it } from 'vitest';
import {
  getRecordedMetrics,
  measureRender,
  recordMetric,
  resetMetrics,
  startSpan,
} from '../../src/index.ts';

describe('monitoring', () => {
  it('starts and ends a span', () => {
    const span = startSpan('http', { route: '/health' });
    span.end();
    expect(span.name).toBe('http');
    expect(typeof span.attributes.durationMs).toBe('number');
  });

  it('records metrics', () => {
    resetMetrics();
    recordMetric({ name: 'Invocations', value: 1, unit: 'Count' });
    expect(getRecordedMetrics()).toHaveLength(1);
    resetMetrics();
    expect(getRecordedMetrics()).toHaveLength(0);
  });

  it('measures render timing', () => {
    expect(measureRender(10, 25)).toBe(15);
    expect(measureRender(25, 10)).toBe(0);
  });
});
