import { HomePage } from '../../pages/home-page.tsx';
import { WhatsAppPage } from '../../pages/whatsapp-page.tsx';
import { AppLayout } from '../layouts/app-layout.tsx';

export function AppRoutes({ pathname = globalThis.location.pathname }: { pathname?: string } = {}) {
  if (pathname === '/whatsapp') {
    return (
      <AppLayout>
        <WhatsAppPage />
      </AppLayout>
    );
  }
  return <HomePage />;
}
