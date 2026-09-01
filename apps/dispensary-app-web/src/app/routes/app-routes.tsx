import { Provider } from 'react-redux';
import { HomePage } from '../../pages/home-page.tsx';
import { MasterCataloguePage } from '../../pages/master-catalogue-page.tsx';
import { WhatsAppPage } from '../../pages/whatsapp-page.tsx';
import { AppLayout } from '../layouts/app-layout.tsx';
import { HqLayout } from '../layouts/hq-layout.tsx';
import { masterCatalogueStore } from '../../store/master-catalogue.ts';

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
      <HqLayout>
        <Provider store={masterCatalogueStore}>
          <MasterCataloguePage />
        </Provider>
      </HqLayout>
    );
  }
  return <HomePage />;
}
