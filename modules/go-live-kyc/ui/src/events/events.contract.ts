import '@namma-medmate/event-bus/event-map';

declare module '@namma-medmate/event-bus/event-map' {
  interface EventMap {
    'go-live-kyc.wizard.updated': { location_id: string };
  }
}

export {};
