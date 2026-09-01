import { lazy, Suspense } from 'react';
import { HomePage } from '../../pages/home-page.tsx';
import { WhatsAppPage } from '../../pages/whatsapp-page.tsx';
import { GatedStubPage } from '../../pages/gated-stub-page.tsx';
import { AppLayout } from '../layouts/app-layout.tsx';

const HqMasterCatalogueRoute = lazy(() => import('./hq-master-catalogue-route.tsx'));

const gated = {
  '/orders': { moduleKey: 'orders', titleKey: 'planGating.stub.orders', moduleLabel: 'Orders' },
  '/inventory': {
    moduleKey: 'inventory',
    titleKey: 'planGating.stub.inventory',
    moduleLabel: 'Inventory',
  },
  '/reports': { moduleKey: 'reports', titleKey: 'planGating.stub.reports', moduleLabel: 'Reports' },
  '/kiosk': { moduleKey: 'kiosk', titleKey: 'planGating.stub.kiosk', moduleLabel: 'Kiosk' },
  '/subscription': {
    moduleKey: 'subscription',
    titleKey: 'planGating.stub.subscription',
    moduleLabel: 'Subscription',
  },
} as const;

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
  const gate = gated[pathname as keyof typeof gated];
  if (gate) {
    return (
      <AppLayout>
        <GatedStubPage
          moduleKey={gate.moduleKey}
          titleKey={gate.titleKey}
          moduleLabel={gate.moduleLabel}
        />
      </AppLayout>
    );
  }
  return <HomePage />;
}
