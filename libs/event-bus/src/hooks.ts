import { useCallback, useEffect, useRef } from 'react';
import { emit, off, on } from './bus.ts';
import type { EventMap } from './event-map.ts';

export function useEventListener<K extends keyof EventMap>(
  eventName: K,
  handler: (payload: EventMap[K]) => void,
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const wrapped = (payload: EventMap[K]) => {
      handlerRef.current(payload);
    };
    on(eventName, wrapped);
    return () => {
      off(eventName, wrapped);
    };
  }, [eventName]);
}

export function useEventEmitter() {
  return useCallback(<K extends keyof EventMap>(eventName: K, payload: EventMap[K]) => {
    emit(eventName, payload);
  }, []);
}
