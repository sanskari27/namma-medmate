import '@namma-medmate/event-bus/event-map';

declare module '@namma-medmate/event-bus/event-map' {
  interface EventMap {
    'masterCatalogue.changed': {
      count: number;
    };
  }
}

export {};
