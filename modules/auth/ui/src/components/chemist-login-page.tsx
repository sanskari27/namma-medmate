import { useState } from 'react';
import { LoginPage } from './login-page.tsx';
import { readAuthError } from '../lib/auth-error.ts';
import {
  useLoginWithPasswordMutation,
  useRequestOtpMutation,
  useVerifyOtpMutation,
} from '../store/api/auth-api.ts';

export function ChemistLoginPage() {
  const [loginPassword, passwordState] = useLoginWithPasswordMutation();
  const [requestOtp, requestState] = useRequestOtpMutation();
  const [verifyOtp, verifyState] = useVerifyOtpMutation();
  const [loginId, setLoginId] = useState('');
  const [errorCode, setErrorCode] = useState<string | undefined>();
  const [lockedUntil, setLockedUntil] = useState<string | undefined>();
  const [challengeId, setChallengeId] = useState('');
  const [resendDisabled, setResendDisabled] = useState(false);
  const submitting = passwordState.isLoading || requestState.isLoading || verifyState.isLoading;

  function applyError(status: number, data: unknown): void {
    const parsed = readAuthError(status, data);
    setErrorCode(parsed.code ?? 'UNAVAILABLE');
    setLockedUntil(parsed.lockedUntil);
  }

  return (
    <LoginPage
      errorCode={errorCode}
      lockedUntil={lockedUntil}
      challenge={challengeId ? { challengeId } : undefined}
      submitting={submitting}
      resendDisabled={resendDisabled}
      onPasswordSubmit={async ({ loginId: nextLoginId, password, rememberDevice }) => {
        setLoginId(nextLoginId);
        const result = await loginPassword({
          loginId: nextLoginId,
          password,
          rememberDevice,
        });
        if ('error' in result) {
          applyError(result.error.status, result.error.data);
        }
      }}
      onOtpRequest={async (nextLoginId) => {
        setLoginId(nextLoginId);
        const result = await requestOtp({ loginId: nextLoginId });
        if ('error' in result) {
          applyError(result.error.status, result.error.data);
          return;
        }
        setErrorCode(undefined);
        setChallengeId(result.data.challenge_id);
        setResendDisabled(true);
        globalThis.setTimeout(() => setResendDisabled(false), 30_000);
      }}
      onOtpVerify={async (otp, rememberDevice) => {
        const result = await verifyOtp({
          loginId,
          challengeId,
          otp,
          rememberDevice,
        });
        if ('error' in result) {
          applyError(result.error.status, result.error.data);
        }
      }}
      onOtpResend={async () => {
        const result = await requestOtp({ loginId });
        if ('error' in result) {
          applyError(result.error.status, result.error.data);
          return;
        }
        setChallengeId(result.data.challenge_id);
        setResendDisabled(true);
        globalThis.setTimeout(() => setResendDisabled(false), 30_000);
      }}
    />
  );
}
