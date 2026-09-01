import { useState } from 'react';
import { LoginPage } from './login-page.tsx';
import { readMutationFailure } from '../lib/auth-error.ts';
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

  function applyError(result: object): boolean {
    const parsed = readMutationFailure(result);
    if (!parsed) {
      return false;
    }
    setErrorCode(parsed.code ?? 'UNAVAILABLE');
    setLockedUntil(parsed.lockedUntil);
    return true;
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
        applyError(result);
      }}
      onOtpRequest={async (nextLoginId) => {
        setLoginId(nextLoginId);
        const result = await requestOtp({ loginId: nextLoginId });
        const data = 'data' in result ? result.data : undefined;
        if (data) {
          setErrorCode(undefined);
          setChallengeId(data.challenge_id);
          setResendDisabled(true);
          globalThis.setTimeout(() => setResendDisabled(false), 30_000);
          return;
        }
        applyError(result);
      }}
      onOtpVerify={async (otp, rememberDevice) => {
        const result = await verifyOtp({
          loginId,
          challengeId,
          otp,
          rememberDevice,
        });
        applyError(result);
      }}
      onOtpResend={async () => {
        const result = await requestOtp({ loginId });
        const data = 'data' in result ? result.data : undefined;
        if (data) {
          setChallengeId(data.challenge_id);
          setResendDisabled(true);
          globalThis.setTimeout(() => setResendDisabled(false), 30_000);
          return;
        }
        applyError(result);
      }}
    />
  );
}
