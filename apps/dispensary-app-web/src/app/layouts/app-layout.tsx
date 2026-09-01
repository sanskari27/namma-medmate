import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { TenantShell } from '@namma-medmate/tenancy-ui';
import { MandatoryWhatsAppBanner } from '@namma-medmate/whatsapp-ui';
import { PlanGatingNav } from '@namma-medmate/plan-gating-ui';
import { tenancyStore } from '../../store/tenancy.ts';
import { whatsappStore } from '../../store/whatsapp.ts';
import { planGatingStore } from '../../store/plan-gating.ts';
import { getLocationId } from '../../services/api/token.ts';

export function AppLayout({ children }: { children: ReactNode }) {
  const skipTenancyQuery = !getLocationId();
  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:rounded-md focus:bg-cta focus:px-4 focus:py-2 focus:text-cta-foreground"
      >
        Skip to main content
      </a>
      <header className="border-b border-border bg-background/80 px-5 py-0 backdrop-blur-md">
        <Provider store={tenancyStore}>
          <TenantShell skipQuery={skipTenancyQuery} />
        </Provider>
        <Provider store={planGatingStore}>
          <PlanGatingNav skipQuery={skipTenancyQuery} />
        </Provider>
      </header>
      <Provider store={whatsappStore}>
        <MandatoryWhatsAppBanner skipQuery={skipTenancyQuery} locationId={getLocationId()} />
      </Provider>
      <main id="main-content" className="mx-auto max-w-5xl px-6 py-10">
        {children}
      </main>
    </div>
  );
}
