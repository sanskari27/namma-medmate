import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { TenantShell } from '@namma-medmate/tenancy-ui';
import { tenancyStore } from '../../store/tenancy.ts';
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
      </header>
      <main id="main-content" className="mx-auto max-w-3xl px-6 py-10">
        {children}
      </main>
    </div>
  );
}
