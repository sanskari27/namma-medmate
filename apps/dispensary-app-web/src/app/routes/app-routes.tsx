import { lazy, Suspense, type ReactNode } from 'react';
import { LoginPage } from '../../pages/login-page.tsx';
import { getAccessToken, getDeviceToken } from '../../services/api/token.ts';

const PinUnlockRoute = lazy(async () => {
  const { PinUnlockRoute: Route } = await import('../../pages/pin-unlock-page.tsx');
  return { default: Route };
});
const HomePage = lazy(async () => {
  const { HomePage: Page } = await import('../../pages/home-page.tsx');
  return { default: Page };
});
const WhatsAppPage = lazy(async () => {
  const { WhatsAppPage: Page } = await import('../../pages/whatsapp-page.tsx');
  return { default: Page };
});
const ManageUsersRoute = lazy(async () => {
  const { ManageUsersRoute: Route } = await import('../../pages/manage-users-page.tsx');
  return { default: Route };
});
const EmployeesRoute = lazy(async () => {
  const { EmployeesRoute: Route } = await import('../../pages/employees-page.tsx');
  return { default: Route };
});
const GatedStubPage = lazy(async () => {
  const { GatedStubPage: Page } = await import('../../pages/gated-stub-page.tsx');
  return { default: Page };
});
const AppLayout = lazy(async () => {
  const { AppLayout: Layout } = await import('../layouts/app-layout.tsx');
  return { default: Layout };
});
const GoLiveKycRoute = lazy(async () => {
  const { GoLiveKycRoute: Route } = await import('../../pages/go-live-kyc-page.tsx');
  return { default: Route };
});
const HqMasterCatalogueRoute = lazy(() => import('./hq-master-catalogue-route.tsx'));
const HqGoLiveKycRoute = lazy(() => import('./hq-go-live-kyc-route.tsx'));

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

function Suspend({ children }: { children: ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}

function AuthenticatedLayout({ children }: { children: ReactNode }) {
  return (
    <Suspend>
      <AppLayout>{children}</AppLayout>
    </Suspend>
  );
}

export function AppRoutes({ pathname = globalThis.location.pathname }: { pathname?: string } = {}) {
  if (pathname === '/login') {
    return <LoginPage />;
  }
  if (pathname === '/login/pin') {
    return (
      <Suspend>
        <PinUnlockRoute />
      </Suspend>
    );
  }
  if (!getAccessToken()) {
    return getDeviceToken() ? (
      <Suspend>
        <PinUnlockRoute />
      </Suspend>
    ) : (
      <LoginPage />
    );
  }
  if (pathname === '/whatsapp') {
    return (
      <AuthenticatedLayout>
        <WhatsAppPage />
      </AuthenticatedLayout>
    );
  }
  if (pathname === '/account/users') {
    return (
      <AuthenticatedLayout>
        <ManageUsersRoute />
      </AuthenticatedLayout>
    );
  }
  if (pathname === '/account/employees') {
    return (
      <AuthenticatedLayout>
        <EmployeesRoute />
      </AuthenticatedLayout>
    );
  }
  if (pathname === '/account/go-live') {
    return (
      <AuthenticatedLayout>
        <GoLiveKycRoute />
      </AuthenticatedLayout>
    );
  }
  if (pathname === '/hq/go-live-kyc') {
    return (
      <Suspend>
        <HqGoLiveKycRoute />
      </Suspend>
    );
  }
  if (pathname === '/hq/master-catalogue') {
    return (
      <Suspend>
        <HqMasterCatalogueRoute />
      </Suspend>
    );
  }
  const gate = gated[pathname as keyof typeof gated];
  if (gate) {
    return (
      <AuthenticatedLayout>
        <GatedStubPage
          moduleKey={gate.moduleKey}
          titleKey={gate.titleKey}
          moduleLabel={gate.moduleLabel}
        />
      </AuthenticatedLayout>
    );
  }
  return (
    <Suspend>
      <HomePage />
    </Suspend>
  );
}
