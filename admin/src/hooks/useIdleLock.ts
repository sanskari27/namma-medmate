import { useCallback, useEffect, useRef, useState } from 'react';

export const IDLE_LOCK_MS = 5 * 60 * 1000;
export const LAST_ACTIVITY_KEY = 'nmm.admin.lastActivityAt';

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'touchstart', 'click', 'scroll'] as const;

export function useIdleLock(enabled: boolean) {
  const [locked, setLocked] = useState(false);
  const lockedRef = useRef(locked);
  lockedRef.current = locked;

  const markActivity = useCallback(() => {
    sessionStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLocked(false);
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
    const poll = window.setInterval(() => {
      const raw = sessionStorage.getItem(LAST_ACTIVITY_KEY);
      const last = raw ? Number(raw) : Date.now();
      if (Date.now() - last >= IDLE_LOCK_MS) {
        setLocked(true);
      }
    }, 1000);
    const raw = sessionStorage.getItem(LAST_ACTIVITY_KEY);
    const last = raw ? Number(raw) : Date.now();
    if (Date.now() - last >= IDLE_LOCK_MS) {
      setLocked(true);
    }
    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity);
      }
      window.clearInterval(poll);
    };
  }, [enabled, markActivity]);

  const acknowledgeUnlock = useCallback(() => {
    markActivity();
    setLocked(false);
  }, [markActivity]);

  return { locked: enabled && locked, acknowledgeUnlock };
}
