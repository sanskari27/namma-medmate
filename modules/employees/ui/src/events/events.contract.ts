import '@namma-medmate/event-bus/event-map';

declare module '@namma-medmate/event-bus/event-map' {
  interface EventMap {
    'employees.list.changed': { location_id: string };
  }
}

export {};
