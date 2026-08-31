import type { EventMap } from './event-map.ts';

type Handler<T> = (payload: T) => void;

const listeners = new Map<string, Set<Handler<unknown>>>();

export function on<K extends keyof EventMap>(eventName: K, handler: Handler<EventMap[K]>): void {
  const key = String(eventName);
  const set = listeners.get(key) ?? new Set();
  set.add(handler as Handler<unknown>);
  listeners.set(key, set);
}

export function off<K extends keyof EventMap>(eventName: K, handler: Handler<EventMap[K]>): void {
  const key = String(eventName);
  const set = listeners.get(key);
  if (!set) {
    return;
  }
  set.delete(handler as Handler<unknown>);
  if (set.size === 0) {
    listeners.delete(key);
  }
}

export function emit<K extends keyof EventMap>(eventName: K, payload: EventMap[K]): void {
  const set = listeners.get(String(eventName));
  if (!set) {
    return;
  }
  for (const handler of [...set]) {
    handler(payload);
  }
}

export function once<K extends keyof EventMap>(eventName: K, handler: Handler<EventMap[K]>): void {
  const wrapped: Handler<EventMap[K]> = (payload) => {
    off(eventName, wrapped);
    handler(payload);
  };
  on(eventName, wrapped);
}

export function resetEventBus(): void {
  listeners.clear();
}
