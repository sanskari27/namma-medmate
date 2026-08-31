import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useEventEmitter } from '@namma-medmate/event-bus';
import type { AuthRootState } from '../store/index.ts';
import '../events/events.contract.ts';

export function useSessionEvents(): void {
  const emit = useEventEmitter();
  const session = useSelector((state: AuthRootState) => state.session);

  useEffect(() => {
    if (session.status === 'idle') {
      return;
    }
    emit('auth.session.changed', {
      status:
        session.status === 'loading'
          ? 'loading'
          : session.status === 'authenticated'
            ? 'authenticated'
            : session.status === 'unauthenticated'
              ? 'unauthenticated'
              : 'error',
      sub: session.sub,
    });
  }, [emit, session.status, session.sub]);
}
