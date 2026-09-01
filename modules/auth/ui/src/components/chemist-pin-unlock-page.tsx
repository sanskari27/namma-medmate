import { useState } from 'react';
import { PinUnlockPage } from './pin-unlock-page.tsx';
import { LoginPage } from './login-page.tsx';
import { readAuthError } from '../lib/auth-error.ts';
import { useVerifyPinMutation } from '../store/api/auth-api.ts';

export interface ChemistPinUnlockPageProps {
  deviceToken?: string;
  loginId?: string;
  onUsePassword?: () => void;
}

export function ChemistPinUnlockPage({
  deviceToken,
  loginId,
  onUsePassword,
}: ChemistPinUnlockPageProps) {
  const [verifyPin, pinState] = useVerifyPinMutation();
  const [errorCode, setErrorCode] = useState<string | undefined>();
  const [lockedUntil, setLockedUntil] = useState<string | undefined>();

  if (!deviceToken || !loginId) {
    return <LoginPage />;
  }

  return (
    <PinUnlockPage
      loginId={loginId}
      errorCode={errorCode}
      lockedUntil={lockedUntil}
      submitting={pinState.isLoading}
      onUnlock={async (pin) => {
        const result = await verifyPin({ pin, deviceToken, loginId });
        if ('error' in result) {
          const parsed = readAuthError(result.error.status, result.error.data);
          setErrorCode(parsed.code ?? 'UNAVAILABLE');
          setLockedUntil(parsed.lockedUntil);
        }
      }}
      onUsePassword={onUsePassword}
    />
  );
}
