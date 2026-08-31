import { useEffect } from 'react';
import { useEventEmitter } from '@namma-medmate/event-bus';
import '../events/events.contract.ts';

export function useWhatsAppMandatoryChanged(locationId: string | undefined, count: number): void {
  const emit = useEventEmitter();
  useEffect(() => {
    emit('whatsapp.mandatory.changed', { location_id: locationId, count });
  }, [emit, locationId, count]);
}
