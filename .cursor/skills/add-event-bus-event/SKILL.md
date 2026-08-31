---
name: add-event-bus-event
description: Add a typed event-bus contract for cross-module UI. Use when a UI module must publish or subscribe without importing another module-ui.
---

# Add event-bus event

Copy `modules/auth/ui/src/events/events.contract.ts`:

```ts
import '@namma-medmate/event-bus/event-map';

declare module '@namma-medmate/event-bus/event-map' {
  interface EventMap {
    'slug.event.name': { /* payload */ };
  }
}

export {};
```

Import the contract from `src/index.ts`. Use `useEventListener` / `useEventEmitter`. Do not import another module’s UI internals.
