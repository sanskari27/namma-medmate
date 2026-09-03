import { CounterFeatureSlider, CounterFeatureStrip } from '@molecules';
import { Button, Reveal } from '@atoms';
import { ROUTES } from '@/libs/constants/routes.const';
import { ApiError, isApiError, verifyPharmacyEmail } from '@/services/tenant';
import { AlertCircle, CheckCircle2, WifiOff } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

type FormStatus =
  'empty' | 'loading' | 'validation' | 'denied' | 'conflict' | 'failure' | 'success';

function statusCopy(status: FormStatus): { icon: typeof AlertCircle; text: string } | null {
  switch (status) {
    case 'empty':
      return {
        icon: AlertCircle,
        text: 'Open the verification link from the owner email. This page needs that token.',
      };
    case 'validation':
      return {
        icon: AlertCircle,
        text: 'This verification link is missing a token. Use the link from the owner email.',
      };
    case 'denied':
      return {
        icon: AlertCircle,
        text: 'This verification link is expired or already used. Register again if needed.',
      };
    case 'conflict':
      return {
        icon: AlertCircle,
        text: 'This pharmacy email was already verified. Sign in at the counter.',
      };
    case 'failure':
      return {
        icon: WifiOff,
        text: 'Could not reach the server. Open the owner email link from this counter again.',
      };
    case 'success':
      return {
        icon: CheckCircle2,
        text: 'Owner email verified. Sign in at this counter, then finish KYC before floor modules open.',
      };
    default:
      return null;
  }
}

export default function VerifyEmailScreen() {
  const statusId = useId();
  const [params] = useSearchParams();
  const token = params.get('token')?.trim() ?? '';
  const [status, setStatus] = useState<FormStatus>(token ? 'loading' : 'empty');
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) {
      return;
    }
    started.current = true;
    void (async () => {
      try {
        await verifyPharmacyEmail(token);
        setStatus('success');
      } catch (error) {
        if (isApiError(error) || error instanceof ApiError) {
          if (error.status === 409) {
            setStatus('conflict');
            return;
          }
          if (error.status === 401 || error.status === 403 || error.status === 422) {
            setStatus('denied');
            return;
          }
        }
        setStatus('failure');
      }
    })();
  }, [token]);

  const copy = statusCopy(status);

  return (
    <div className="grid min-h-screen bg-canvas md:grid-cols-[minmax(0,1fr)_28rem]">
      <CounterFeatureSlider />
      <section className="flex min-h-screen flex-col border-l-4 border-brand bg-surface">
        <CounterFeatureStrip />
        <Reveal className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-12">
          <div className="space-y-4">
            <div>
              <h1 className="text-xl font-semibold text-ink">Verify owner email</h1>
              <p className="mt-1 text-sm text-muted">
                Confirm the pharmacy email so this counter can continue toward KYC.
              </p>
            </div>
            {copy ? (
              <p
                id={statusId}
                role="alert"
                className="flex items-start gap-2 border border-line bg-canvas px-3 py-2 text-sm text-ink"
              >
                <copy.icon className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
                <span>{copy.text}</span>
              </p>
            ) : null}
            {status === 'loading' ? (
              <p className="text-sm text-muted" aria-live="polite">
                Checking the verification link…
              </p>
            ) : null}
            {status === 'success' || status === 'conflict' ? (
              <Button asChild className="w-full">
                <Link to={ROUTES.LOGIN}>Sign in at this counter</Link>
              </Button>
            ) : (
              <p className="text-sm text-muted">
                <Link to={ROUTES.LOGIN} className="text-brand underline-offset-2 hover:underline">
                  Back to counter sign in
                </Link>
              </p>
            )}
          </div>
        </Reveal>
      </section>
    </div>
  );
}
