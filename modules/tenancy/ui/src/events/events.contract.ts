import '@namma-medmate/event-bus/event-map';

declare module '@namma-medmate/event-bus/event-map' {
  interface EventMap {
    'tenancy.context.changed': {
      status: 'loading' | 'ready' | 'error';
      tenant_id?: string;
      location_id?: string;
      display_name?: string;
    };
  }
}

export {};
