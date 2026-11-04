import { act, renderHook } from '@testing-library/react-native';

import { pad, useFlashCountdown } from './useFlashCountdown';

describe('useFlashCountdown', () => {
  it('counts the duration down into hours, minutes and seconds', async () => {
    const { result } = await renderHook(() =>
      useFlashCountdown(2 * 60 * 60 * 1000 + 30 * 1000),
    );

    expect(result.current.hours).toBe(2);
    expect(result.current.minutes).toBe(0);
    expect(result.current.seconds).toBe(30);
    expect(result.current.expired).toBe(false);
  });

  it('reports the countdown as expired once the deadline has passed', async () => {
    const { result } = await renderHook(() => useFlashCountdown(-1000));

    expect(result.current.expired).toBe(true);
    expect(result.current.hours).toBe(0);
    expect(result.current.minutes).toBe(0);
    expect(result.current.seconds).toBe(0);
  });

  it('ticks once a second', async () => {
    jest.useFakeTimers();
    try {
      const { result } = await renderHook(() => useFlashCountdown(10_000));
      const before = result.current.seconds;

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.seconds).toBe(before - 1);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('pad', () => {
  it('pads to two digits', () => {
    expect(pad(5)).toBe('05');
    expect(pad(23)).toBe('23');
    expect(pad(0)).toBe('00');
  });
});
