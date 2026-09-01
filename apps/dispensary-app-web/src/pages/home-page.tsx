import { Provider } from 'react-redux';
import { AuthWidget } from '@namma-medmate/auth-ui';
import { GoLiveBanner } from '@namma-medmate/go-live-kyc-ui';
import { AppLayout } from '../app/layouts/app-layout.tsx';
import { useSessionStatusLabel } from '../hooks/use-session-status-label.ts';
import { goLiveKycStore } from '../store/go-live-kyc.ts';
import { getLocationId } from '../services/api/token.ts';

export function HomePage() {
  const status = useSessionStatusLabel();
  return (
    <AppLayout>
      <h1 className="mb-6 text-3xl font-semibold text-ink">Session</h1>
      <p className="sr-only" aria-live="polite">
        Session status {status}
      </p>
      <Provider store={goLiveKycStore}>
        <GoLiveBanner locationId={getLocationId() ?? ''} />
      </Provider>
      <AuthWidget />
    </AppLayout>
  );
}
