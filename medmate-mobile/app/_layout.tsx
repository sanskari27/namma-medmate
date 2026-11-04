import { Stack } from 'expo-router';

import { AppProviders } from '@/shell/AppProviders';
import { colors } from '@/theme';

/**
 * Root stack.
 *
 * Route groups live underneath: `(onboarding)` for the sign-up flow and
 * `(app)` for the signed-in tabs. Groups do not add a path segment, so the
 * URLs stay `/login`, `/otp`, `/home`, …
 */
export default function RootLayout() {
  return (
    <AppProviders>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: colors.forest },
        }}
      />
    </AppProviders>
  );
}
