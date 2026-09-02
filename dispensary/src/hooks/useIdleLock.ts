import { useCallback, useEffect, useState } from 'react';

export const IDLE_LOGOUT_MS = 5 * 60 * 1000;
export const LAST_ACTIVITY_KEY = 'nmm.dispensary.lastActivityAt';

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'touchstart', 'click', 'scroll'] as const;

function idleMs(): number {
  const raw = sessionStorage.getItem(LAST_ACTIVITY_KEY);
  const last = raw ? Number(raw) : Date.now();
  return Date.now() - last;
}

export function useIdleLock(enabled: boolean) {
  const [expired, setExpired] = useState(false);

  const markActivity = useCallback(() => {
    sessionStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
  }, []);

  const applyIdle = useCallback(() => {
    if (idleMs() >= IDLE_LOGOUT_MS) {
      setExpired(true);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setExpired(false);
      return;
    }
    if (!sessionStorage.getItem(LAST_ACTIVITY_KEY)) {
      markActivity();
    }
    const onActivity = () => markActivity();
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity, { passive: true });
    }
    const poll = window.setInterval(applyIdle, 1000);
    applyIdle();
    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity);
      }
      window.clearInterval(poll);
    };
  }, [enabled, markActivity, applyIdle]);

  return { expired: enabled && expired };
}
