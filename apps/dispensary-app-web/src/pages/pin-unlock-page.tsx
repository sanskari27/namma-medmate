import { ChemistPinUnlockPage } from '@namma-medmate/auth-ui';
import {
  clearDeviceToken,
  clearStoredLoginId,
  getDeviceToken,
  getStoredLoginId,
  navigateTo,
} from '../services/api/token.ts';

export function PinUnlockRoute() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-10">
      <ChemistPinUnlockPage
        deviceToken={getDeviceToken()}
        loginId={getStoredLoginId()}
        onUsePassword={() => {
          clearDeviceToken();
          clearStoredLoginId();
          navigateTo('/login');
        }}
      />
    </main>
  );
}
