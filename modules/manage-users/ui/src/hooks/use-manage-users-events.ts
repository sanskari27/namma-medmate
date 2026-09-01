import { useEventEmitter } from '@namma-medmate/event-bus';
import '../events/events.contract.ts';

export function useManageUsersEvents() {
  const emit = useEventEmitter();
  return {
    listChanged: (locationId: string) => {
      emit('manage-users.list.changed', { location_id: locationId });
    },
    userSaved: (userId: string) => {
      emit('manage-users.user.saved', { user_id: userId });
    },
  };
}
