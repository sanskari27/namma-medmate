import { useState } from 'react';
import { PinUnlockPage } from './pin-unlock-page.tsx';
import { LoginPage } from './login-page.tsx';
import { readMutationFailure } from '../lib/auth-error.ts';
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
        const parsed = readMutationFailure(await verifyPin({ pin, deviceToken, loginId }));
        if (parsed) {
          setErrorCode(parsed.code ?? 'UNAVAILABLE');
          setLockedUntil(parsed.lockedUntil);
        }
      }}
      onUsePassword={onUsePassword}
    />
  );
}
