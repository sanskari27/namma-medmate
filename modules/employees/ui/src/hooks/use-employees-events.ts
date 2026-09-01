import { useEventEmitter } from '@namma-medmate/event-bus';
import '../events/events.contract.ts';

export function useEmployeesEvents() {
  const emit = useEventEmitter();
  return {
    listChanged(locationId: string): void {
      emit('employees.list.changed', { location_id: locationId });
    },
  };
}
