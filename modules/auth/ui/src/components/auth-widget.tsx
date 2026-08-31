import { StatusBanner } from '@namma-medmate/shared-ui';
import { useSelector } from 'react-redux';
import { useSessionEvents } from '../hooks/use-session-events.ts';
import { useGetSessionQuery } from '../store/api/auth-api.ts';
import type { AuthRootState } from '../store/index.ts';
import type { AuthWidgetProps } from '../types/auth-widget.ts';

export function AuthWidget({ title = 'Dispensary session', skipQuery = false }: AuthWidgetProps) {
  useGetSessionQuery(undefined, { skip: skipQuery });
  useSessionEvents();
  const session = useSelector((state: AuthRootState) => state.session);

  const message =
    session.status === 'loading' || session.status === 'idle'
      ? 'Checking your session.'
      : session.status === 'authenticated'
        ? `Signed in as ${session.sub}.`
        : session.status === 'unauthenticated'
          ? (session.message ?? 'Sign in to continue.')
          : (session.message ?? 'Unable to verify your session.');

  const tone =
    session.status === 'error' ? 'error' : session.status === 'authenticated' ? 'success' : 'info';

  return (
    <section
      className="auth-widget rounded-md bg-surface-raised p-6 shadow-card"
      aria-labelledby="auth-widget-title"
    >
      <h2 id="auth-widget-title" className="mb-3 text-xl font-semibold text-ink">
        {title}
      </h2>
      <StatusBanner tone={tone}>{message}</StatusBanner>
    </section>
  );
}
