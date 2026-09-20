import { Link } from 'react-router-dom';
import { ROUTES } from '@/libs/constants/routes.const';
import { HOSPITAL_INDENTS_CONTENT } from '../../HospitalIndentsScreen.content';
import type { PageStatus } from '../../HospitalIndentsScreen.utils';

type HospitalIndentsStatusBannerProps = {
  status: PageStatus;
  message: string | null;
  onDismiss: () => void;
  onRetry?: () => void;
};

export function HospitalIndentsStatusBanner({
  status,
  message,
  onDismiss,
  onRetry,
}: HospitalIndentsStatusBannerProps) {
  if (!status) {
    return null;
  }

  const tone =
    status === 'success'
      ? 'ok'
      : status === 'failure' || status === 'denied'
        ? 'alert'
        : 'warn';

  const copy =
    message ??
    (status === 'loading'
      ? HOSPITAL_INDENTS_CONTENT.loading
      : status === 'empty'
        ? HOSPITAL_INDENTS_CONTENT.empty
        : status === 'validation'
          ? HOSPITAL_INDENTS_CONTENT.validation
          : status === 'denied'
            ? HOSPITAL_INDENTS_CONTENT.denied
            : status === 'conflict'
              ? HOSPITAL_INDENTS_CONTENT.conflict
              : status === 'failure'
                ? HOSPITAL_INDENTS_CONTENT.loadFailed
                : status === 'plan_limit'
                  ? HOSPITAL_INDENTS_CONTENT.planLimit
                  : '');

  return (
    <p className="hi-banner" role={status === 'loading' ? 'status' : 'alert'} data-tone={tone}>
      {copy}
      {status === 'plan_limit' ? (
        <>
          {' '}
          <Link to={ROUTES.SUBSCRIPTION}>{HOSPITAL_INDENTS_CONTENT.openPlan}</Link>
        </>
      ) : null}
      {status === 'failure' && onRetry ? (
        <>
          {' '}
          <button type="button" onClick={onRetry}>
            {HOSPITAL_INDENTS_CONTENT.retry}
          </button>
        </>
      ) : null}
      {status !== 'loading' && status !== 'empty' && status !== 'plan_limit' ? (
        <>
          {' '}
          <button type="button" onClick={onDismiss}>
            {HOSPITAL_INDENTS_CONTENT.dismiss}
          </button>
        </>
      ) : null}
    </p>
  );
}
