import '@namma-medmate/event-bus/event-map';

declare module '@namma-medmate/event-bus/event-map' {
  interface EventMap {
    'manage-users.list.changed': { location_id: string };
    'manage-users.user.saved': { user_id: string };
  }
}

export {};
