import { translate } from '@namma-medmate/i18n';
import { Button, StatusBanner } from '@namma-medmate/shared-ui';
import { useSelector } from 'react-redux';
import { authMessages } from '../i18n/en.ts';
import { useSessionEvents } from '../hooks/use-session-events.ts';
import { useGetSessionQuery, useLogoutMutation } from '../store/api/auth-api.ts';
import type { AuthRootState } from '../store/index.ts';
import type { AuthWidgetProps } from '../types/auth-widget.ts';

export function AuthWidget({ title, skipQuery = false, onLogout }: AuthWidgetProps) {
  useGetSessionQuery(undefined, { skip: skipQuery });
  useSessionEvents();
  const session = useSelector((state: AuthRootState) => state.session);
  const [logout, logoutState] = useLogoutMutation();
  const heading = title ?? translate(authMessages, 'auth.session.title');

  const message =
    session.status === 'loading' || session.status === 'idle'
      ? translate(authMessages, 'auth.session.checking')
      : session.status === 'authenticated'
        ? translate(authMessages, 'auth.session.signedIn').replace(
            '{{login_id}}',
            session.loginId ?? session.sub ?? '',
          )
        : session.status === 'unauthenticated'
          ? (session.message ?? translate(authMessages, 'auth.session.unauthenticated'))
          : (session.message ?? translate(authMessages, 'auth.session.error'));

  const tone =
    session.status === 'error' ? 'error' : session.status === 'authenticated' ? 'success' : 'info';

  return (
    <section
      className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm"
      aria-labelledby="auth-widget-title"
    >
      <h2 id="auth-widget-title" className="text-xl font-semibold text-foreground">
        {heading}
      </h2>
      <StatusBanner tone={tone}>{message}</StatusBanner>
      {session.status === 'authenticated' ? (
        <Button
          type="button"
          variant="outline"
          disabled={logoutState.isLoading}
          onClick={async () => {
            await logout();
            onLogout?.();
          }}
        >
          {translate(authMessages, 'auth.session.logout')}
        </Button>
      ) : null}
    </section>
  );
}
