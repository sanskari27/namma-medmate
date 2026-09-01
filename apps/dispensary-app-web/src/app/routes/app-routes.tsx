import { lazy, Suspense } from 'react';
import { HomePage } from '../../pages/home-page.tsx';
import { WhatsAppPage } from '../../pages/whatsapp-page.tsx';
import { AppLayout } from '../layouts/app-layout.tsx';

const HqMasterCatalogueRoute = lazy(() => import('./hq-master-catalogue-route.tsx'));

export function AppRoutes({ pathname = globalThis.location.pathname }: { pathname?: string } = {}) {
  if (pathname === '/whatsapp') {
    return (
      <AppLayout>
        <WhatsAppPage />
      </AppLayout>
    );
  }
  if (pathname === '/hq/master-catalogue') {
    return (
      <Suspense fallback={null}>
        <HqMasterCatalogueRoute />
      </Suspense>
    );
  }
  return <HomePage />;
}
