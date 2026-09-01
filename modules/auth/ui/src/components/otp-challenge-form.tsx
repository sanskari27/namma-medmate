import { type FormEvent } from 'react';
import { translate } from '@namma-medmate/i18n';
import { Button, InputOTP, InputOTPGroup, InputOTPSlot, Label } from '@namma-medmate/shared-ui';
import { authMessages } from '../i18n/en.ts';

export interface OtpChallengeFormProps {
  otp: string;
  submitting?: boolean;
  resendDisabled?: boolean;
  onOtpChange?: (otp: string) => void;
  onVerify?: (otp: string) => void | Promise<void>;
  onResend?: () => void | Promise<void>;
}

export function OtpChallengeForm({
  otp,
  submitting = false,
  resendDisabled = false,
  onOtpChange,
  onVerify,
  onResend,
}: OtpChallengeFormProps) {
  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (submitting) {
      return;
    }
    await onVerify?.(otp);
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold text-foreground">
          {translate(authMessages, 'auth.otp.title')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {translate(authMessages, 'auth.otp.expires')}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="auth-otp">{translate(authMessages, 'auth.otp.code')}</Label>
        <InputOTP
          id="auth-otp"
          maxLength={4}
          value={otp}
          onChange={onOtpChange}
          aria-label={translate(authMessages, 'auth.otp.code')}
        >
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
          </InputOTPGroup>
        </InputOTP>
      </div>
      <Button type="submit" className="w-full" disabled={submitting || otp.length !== 4}>
        {translate(authMessages, 'auth.otp.submit')}
      </Button>
      <Button
        type="button"
        variant="ghost"
        className="w-full"
        disabled={submitting || resendDisabled}
        onClick={() => void onResend?.()}
      >
        {translate(authMessages, 'auth.otp.resend')}
      </Button>
    </form>
  );
}
