import { useState, type FormEvent } from 'react';
import { translate } from '@namma-medmate/i18n';
import { Button, Input, Label, StatusBanner } from '@namma-medmate/shared-ui';
import { authMessages } from '../i18n/en.ts';
import { errorCopyKey } from '../lib/auth-error.ts';
import { LockoutBanner } from './lockout-banner.tsx';

export interface PinUnlockPageProps {
  loginId?: string;
  errorCode?: string;
  lockedUntil?: string;
  submitting?: boolean;
  onUnlock?: (pin: string) => void | Promise<void>;
  onUsePassword?: () => void;
}

export function PinUnlockPage({
  loginId,
  errorCode,
  lockedUntil,
  submitting = false,
  onUnlock,
  onUsePassword,
}: PinUnlockPageProps) {
  const [pin, setPin] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (submitting) {
      return;
    }
    await onUnlock?.(pin);
  }

  return (
    <section
      className="mx-auto flex w-full max-w-md flex-col gap-6 rounded-2xl border border-border bg-card p-8 shadow-sm"
      aria-labelledby="auth-pin-title"
    >
      <div className="flex flex-col gap-2">
        <h1 id="auth-pin-title" className="text-3xl font-semibold tracking-tight text-foreground">
          {translate(authMessages, 'auth.pin.title')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {translate(authMessages, 'auth.pin.subtitle')}
        </p>
        {loginId ? <p className="text-sm font-medium text-foreground">{loginId}</p> : null}
      </div>
      {lockedUntil ? <LockoutBanner lockedUntil={lockedUntil} /> : null}
      {errorCode && errorCode !== 'ACCOUNT_LOCKED' ? (
        <StatusBanner tone="error">{translate(authMessages, errorCopyKey(errorCode))}</StatusBanner>
      ) : null}
      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2">
          <Label htmlFor="auth-pin">{translate(authMessages, 'auth.pin.submit')}</Label>
          <Input
            id="auth-pin"
            name="pin"
            inputMode="numeric"
            autoComplete="off"
            value={pin}
            onChange={(event) => setPin(event.target.value)}
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>
          {translate(authMessages, 'auth.pin.submit')}
        </Button>
        <Button type="button" variant="ghost" className="w-full" onClick={() => onUsePassword?.()}>
          {translate(authMessages, 'auth.pin.usePassword')}
        </Button>
      </form>
    </section>
  );
}
