import { useEventListener } from '@namma-medmate/event-bus';
import { useState } from 'react';

export function useSessionStatusLabel(): string {
  const [label, setLabel] = useState('unknown');
  useEventListener('auth.session.changed', (payload) => {
    setLabel(payload.status);
  });
  return label;
}
