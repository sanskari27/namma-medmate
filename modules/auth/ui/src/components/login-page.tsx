import { useState, type FormEvent } from 'react';
import { translate } from '@namma-medmate/i18n';
import { Button, Checkbox, Input, Label, StatusBanner } from '@namma-medmate/shared-ui';
import { authMessages } from '../i18n/en.ts';
import { errorCopyKey } from '../lib/auth-error.ts';
import { LockoutBanner } from './lockout-banner.tsx';
import { OtpChallengeForm } from './otp-challenge-form.tsx';

export interface LoginPageProps {
  passwordEnabled?: boolean;
  otpEnabled?: boolean;
  errorCode?: string;
  lockedUntil?: string;
  challenge?: { challengeId: string } | null;
  submitting?: boolean;
  resendDisabled?: boolean;
  onPasswordSubmit?: (input: {
    loginId: string;
    password: string;
    rememberDevice: boolean;
  }) => void | Promise<void>;
  onOtpRequest?: (loginId: string) => void | Promise<void>;
  onOtpVerify?: (otp: string, rememberDevice: boolean) => void | Promise<void>;
  onOtpResend?: () => void | Promise<void>;
}

export function LoginPage({
  passwordEnabled = true,
  otpEnabled = true,
  errorCode,
  lockedUntil,
  challenge = null,
  submitting = false,
  resendDisabled = false,
  onPasswordSubmit,
  onOtpRequest,
  onOtpVerify,
  onOtpResend,
}: LoginPageProps) {
  const both = passwordEnabled && otpEnabled;
  const [method, setMethod] = useState<'password' | 'otp' | null>(
    both ? null : passwordEnabled ? 'password' : 'otp',
  );
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [rememberDevice, setRememberDevice] = useState(false);
  const selected = method ?? (passwordEnabled ? 'password' : 'otp');

  async function handlePassword(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (submitting) {
      return;
    }
    await onPasswordSubmit?.({ loginId, password, rememberDevice });
  }

  async function handleOtpRequest(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (submitting) {
      return;
    }
    await onOtpRequest?.(loginId);
  }

  return (
    <section
      className="mx-auto flex w-full max-w-md flex-col gap-6 rounded-2xl border border-border bg-card p-8 shadow-sm"
      aria-labelledby="auth-login-title"
    >
      <div className="flex flex-col gap-2">
        <h1 id="auth-login-title" className="text-3xl font-semibold tracking-tight text-foreground">
          {translate(authMessages, 'auth.login.title')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {translate(authMessages, 'auth.login.subtitle')}
        </p>
      </div>
      {lockedUntil ? <LockoutBanner lockedUntil={lockedUntil} /> : null}
      {errorCode && errorCode !== 'ACCOUNT_LOCKED' ? (
        <StatusBanner tone="error">{translate(authMessages, errorCopyKey(errorCode))}</StatusBanner>
      ) : null}
      {both && !challenge ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-foreground">
            {translate(authMessages, 'auth.login.chooseMethod')}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant={selected === 'password' ? 'default' : 'outline'}
              onClick={() => setMethod('password')}
            >
              {translate(authMessages, 'auth.login.password')}
            </Button>
            <Button
              type="button"
              variant={selected === 'otp' ? 'default' : 'outline'}
              onClick={() => setMethod('otp')}
            >
              {translate(authMessages, 'auth.login.otp')}
            </Button>
          </div>
        </div>
      ) : null}
      {challenge ? (
        <OtpChallengeForm
          otp={otp}
          submitting={submitting}
          resendDisabled={resendDisabled}
          onOtpChange={setOtp}
          onVerify={(value) => onOtpVerify?.(value, rememberDevice)}
          onResend={onOtpResend}
        />
      ) : selected === 'password' && passwordEnabled ? (
        <form className="flex flex-col gap-5" onSubmit={handlePassword}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="auth-login-id">{translate(authMessages, 'auth.login.loginId')}</Label>
            <Input
              id="auth-login-id"
              name="login_id"
              autoComplete="username"
              value={loginId}
              onChange={(event) => setLoginId(event.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="auth-password">{translate(authMessages, 'auth.login.password')}</Label>
            <Input
              id="auth-password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          <Checkbox
            checked={rememberDevice}
            onCheckedChange={setRememberDevice}
            aria-label={translate(authMessages, 'auth.login.rememberDevice')}
          />
          <Button type="submit" className="w-full" disabled={submitting}>
            {translate(authMessages, 'auth.login.submit')}
          </Button>
        </form>
      ) : otpEnabled ? (
        <form className="flex flex-col gap-5" onSubmit={handleOtpRequest}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="auth-otp-login-id">
              {translate(authMessages, 'auth.login.loginId')}
            </Label>
            <Input
              id="auth-otp-login-id"
              name="login_id"
              autoComplete="username"
              value={loginId}
              onChange={(event) => setLoginId(event.target.value)}
              required
            />
          </div>
          <Checkbox
            checked={rememberDevice}
            onCheckedChange={setRememberDevice}
            aria-label={translate(authMessages, 'auth.login.rememberDevice')}
          />
          <Button type="submit" className="w-full" disabled={submitting}>
            {translate(authMessages, 'auth.login.otp')}
          </Button>
        </form>
      ) : (
        <StatusBanner tone="error">{translate(authMessages, 'auth.login.noMethod')}</StatusBanner>
      )}
    </section>
  );
}
