import { useCallback, useEffect, useRef, useState } from 'react';

export const IDLE_LOCK_MS = 5 * 60 * 1000;
export const IDLE_LOGOUT_MS = 55 * 60 * 1000;
export const LAST_ACTIVITY_KEY = 'nmm.admin.lastActivityAt';

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'touchstart', 'click', 'scroll'] as const;

function idleMs(): number {
  const raw = sessionStorage.getItem(LAST_ACTIVITY_KEY);
  const last = raw ? Number(raw) : Date.now();
  return Date.now() - last;
}

export function useIdleLock(enabled: boolean) {
  const [locked, setLocked] = useState(false);
  const [expired, setExpired] = useState(false);
  const lockedRef = useRef(locked);
  lockedRef.current = locked;

  const markActivity = useCallback(() => {
    sessionStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
  }, []);

  const applyIdle = useCallback(() => {
    const idle = idleMs();
    if (idle >= IDLE_LOGOUT_MS) {
      setExpired(true);
      setLocked(false);
      return;
    }
    if (idle >= IDLE_LOCK_MS) {
      setLocked(true);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLocked(false);
      setExpired(false);
      return;
    }
    if (!sessionStorage.getItem(LAST_ACTIVITY_KEY)) {
      markActivity();
    }
    const onActivity = () => {
      if (lockedRef.current) {
        return;
      }
      markActivity();
    };
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

  const acknowledgeUnlock = useCallback(() => {
    markActivity();
    setLocked(false);
    setExpired(false);
  }, [markActivity]);

  return { locked: enabled && locked, expired: enabled && expired, acknowledgeUnlock };
}
