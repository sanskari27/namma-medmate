import { Provider } from 'react-redux';
import { WhatsAppInboxPage } from '@namma-medmate/whatsapp-ui';
import { whatsappStore } from '../store/whatsapp.ts';

export function WhatsAppPage() {
  return (
    <Provider store={whatsappStore}>
      <WhatsAppInboxPage />
    </Provider>
  );
}
