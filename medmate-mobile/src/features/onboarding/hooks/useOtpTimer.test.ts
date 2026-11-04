import { act, renderHook } from '@testing-library/react-native';

import { useOtpTimer } from './useOtpTimer';

describe('useOtpTimer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts at the given number of seconds', async () => {
    const { result } = await renderHook(() => useOtpTimer(30));

    expect(result.current?.seconds).toBe(30);
    expect(result.current?.canResend).toBe(false);
  });

  it('counts down one second at a time', async () => {
    const { result } = await renderHook(() => useOtpTimer(30));

    await act(async () => {
      jest.advanceTimersByTime(3000);
    });

    expect(result.current?.seconds).toBe(27);
  });

  it('stops at zero and allows a resend', async () => {
    const { result } = await renderHook(() => useOtpTimer(2));

    await act(async () => {
      jest.advanceTimersByTime(5000);
    });

    expect(result.current?.seconds).toBe(0);
    expect(result.current?.canResend).toBe(true);
  });

  it('restarts the countdown on reset', async () => {
    const { result } = await renderHook(() => useOtpTimer(5));

    await act(async () => {
      jest.advanceTimersByTime(5000);
    });
    expect(result.current?.canResend).toBe(true);

    await act(async () => {
      result.current?.reset();
    });

    expect(result.current?.seconds).toBe(5);
    expect(result.current?.canResend).toBe(false);
  });
});
