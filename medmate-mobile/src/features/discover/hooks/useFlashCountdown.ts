import { useEffect, useState } from 'react';

export interface Countdown {
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

const EMPTY: Countdown = { hours: 0, minutes: 0, seconds: 0, expired: true };

function split(millisecondsLeft: number): Countdown {
  if (millisecondsLeft <= 0) return EMPTY;

  const totalSeconds = Math.floor(millisecondsLeft / 1000);
  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    expired: false,
  };
}

/**
 * Countdown to a deadline.
 *
 * The hook owns the deadline: it is captured once, when the screen mounts,
 * and the remaining time is *derived* from a ticking clock. Deriving beats
 * storing — the countdown is a pure function of (deadline, now), so it can
 * never drift out of sync with the clock.
 */
export function useFlashCountdown(durationMs: number): Countdown {
  // One timestamp for both the start and the current time — two separate
  // `Date.now()` calls could straddle a millisecond and lose a second.
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(startedAt);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  return split(startedAt + durationMs - now);
}

/** Two digits, as the MVP's countdown boxes show. */
export function pad(value: number): string {
  return value.toString().padStart(2, '0');
}
