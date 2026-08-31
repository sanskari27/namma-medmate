import '@namma-medmate/event-bus/event-map';

declare module '@namma-medmate/event-bus/event-map' {
  interface EventMap {
    'whatsapp.mandatory.changed': {
      location_id?: string;
      count: number;
    };
  }
}

export {};
