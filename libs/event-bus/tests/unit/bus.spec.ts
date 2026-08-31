import { afterEach, describe, expect, it, vi } from 'vitest';
import { emit, off, on, once, resetEventBus } from '../../src/index.ts';

declare module '../../src/event-map.ts' {
  interface EventMap {
    'test:ping': { n: number };
  }
}

describe('event-bus', () => {
  afterEach(() => {
    resetEventBus();
  });

  it('delivers events to subscribers', () => {
    const handler = vi.fn();
    on('test:ping', handler);
    emit('test:ping', { n: 1 });
    expect(handler).toHaveBeenCalledWith({ n: 1 });
    off('test:ping', handler);
    emit('test:ping', { n: 2 });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('once unsubscribes after the first emit', () => {
    const handler = vi.fn();
    once('test:ping', handler);
    emit('test:ping', { n: 1 });
    emit('test:ping', { n: 2 });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('ignores emit/off when no listeners exist', () => {
    off('test:ping', vi.fn());
    emit('test:ping', { n: 0 });
  });
});
