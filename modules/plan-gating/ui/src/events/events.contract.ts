import '@namma-medmate/event-bus/event-map';

declare module '@namma-medmate/event-bus/event-map' {
  interface EventMap {
    'planGating.entitlements.changed': {
      plan?: string;
      effective_plan?: string;
    };
  }
}

export {};
