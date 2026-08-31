import '@namma-medmate/event-bus/event-map';

declare module '@namma-medmate/event-bus/event-map' {
  interface EventMap {
    'auth.session.changed': {
      status: 'loading' | 'authenticated' | 'unauthenticated' | 'error';
      sub?: string;
    };
  }
}

export {};
