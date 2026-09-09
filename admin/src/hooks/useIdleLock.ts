import { useCallback, useEffect, useRef, useState } from 'react';

/** Idle before the HQ PIN lock appears. */
export const IDLE_LOCK_MS = 5 * 60 * 1000;
/** @deprecated Use IDLE_LOCK_MS — kept for existing imports. */
export const IDLE_LOGOUT_MS = IDLE_LOCK_MS;
/** Abandoned lock → hard sign-out (session revoke + login picker). */
export const LOCK_ABANDON_MS = 4 * 60 * 60 * 1000;
export const LAST_ACTIVITY_KEY = 'nmm.admin.lastActivityAt';

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'touchstart', 'click', 'scroll'] as const;

function idleMs(): number {
  const raw = sessionStorage.getItem(LAST_ACTIVITY_KEY);
  const last = raw ? Number(raw) : Date.now();
  return Date.now() - last;
}

export function useIdleLock(enabled: boolean) {
  const [locked, setLocked] = useState(false);
  const [abandoned, setAbandoned] = useState(false);
  const lockedAtRef = useRef<number | null>(null);

  const markActivity = useCallback(() => {
    sessionStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
  }, []);

  const clearLock = useCallback(() => {
    markActivity();
    lockedAtRef.current = null;
    setLocked(false);
    setAbandoned(false);
  }, [markActivity]);

  const applyIdle = useCallback(() => {
    if (!locked && idleMs() >= IDLE_LOCK_MS) {
      lockedAtRef.current = Date.now();
      setLocked(true);
      return;
    }
    if (locked && lockedAtRef.current != null && Date.now() - lockedAtRef.current >= LOCK_ABANDON_MS) {
      setAbandoned(true);
    }
  }, [locked]);

  useEffect(() => {
    if (!enabled) {
      lockedAtRef.current = null;
      setLocked(false);
      setAbandoned(false);
      return;
    }
    if (!sessionStorage.getItem(LAST_ACTIVITY_KEY)) {
      markActivity();
    }
    const onActivity = () => {
      if (lockedAtRef.current != null) {
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

  return {
    locked: enabled && locked,
    abandoned: enabled && abandoned,
    clearLock,
    /** @deprecated Prefer `locked` — same signal for layout idle. */
    expired: enabled && locked,
  };
}
