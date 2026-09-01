import '@namma-medmate/event-bus/event-map';

declare module '@namma-medmate/event-bus/event-map' {
  interface EventMap {
    'auth.session.changed': {
      status: 'loading' | 'authenticated' | 'unauthenticated' | 'error';
      sub?: string;
      user_id?: string;
      login_id?: string;
      role?: string;
      tenant_id?: string;
      location_id?: string;
    };
  }
}

export {};
