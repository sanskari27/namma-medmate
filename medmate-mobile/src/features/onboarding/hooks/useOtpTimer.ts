import { useCallback, useEffect, useState } from 'react';

export interface OtpTimer {
  /** Seconds left before another code can be requested. */
  seconds: number;
  /** True once the countdown has run out. */
  canResend: boolean;
  /** Restart the countdown — e.g. after a successful resend. */
  reset: (seconds?: number) => void;
}

/**
 * Countdown before the OTP screen allows a resend.
 *
 * A single interval drives the whole countdown rather than a chain of
 * timeouts: the interval keeps ticking on its own schedule, so the timer
 * cannot drift when a re-render happens between ticks, and it is torn down
 * cleanly when the screen unmounts.
 */
export function useOtpTimer(initialSeconds: number): OtpTimer {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((current) => (current <= 0 ? 0 : current - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const reset = useCallback(
    (next: number = initialSeconds) => {
      setSeconds(next);
    },
    [initialSeconds],
  );

  return { seconds, canResend: seconds <= 0, reset };
}
