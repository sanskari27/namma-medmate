import { useEventEmitter } from '@namma-medmate/event-bus';
import '../events/events.contract.ts';

export function useGoLiveKycEvents() {
  const emit = useEventEmitter();
  return {
    wizardUpdated(locationId: string): void {
      emit('go-live-kyc.wizard.updated', { location_id: locationId });
    },
  };
}
