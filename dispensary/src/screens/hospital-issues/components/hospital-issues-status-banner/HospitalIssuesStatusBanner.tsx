import { Link } from 'react-router-dom';
import { ROUTES } from '@/libs/constants/routes.const';
import { HOSPITAL_ISSUES_CONTENT } from '../../HospitalIssuesScreen.content';
import type { PageStatus } from '../../HospitalIssuesScreen.utils';

type HospitalIssuesStatusBannerProps = {
  status: PageStatus;
  message: string | null;
  onDismiss: () => void;
  onRetry?: () => void;
};

export function HospitalIssuesStatusBanner({
  status,
  message,
  onDismiss,
  onRetry,
}: HospitalIssuesStatusBannerProps) {
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
      ? HOSPITAL_ISSUES_CONTENT.loading
      : status === 'empty'
        ? HOSPITAL_ISSUES_CONTENT.empty
        : status === 'validation'
          ? HOSPITAL_ISSUES_CONTENT.validation
          : status === 'denied'
            ? HOSPITAL_ISSUES_CONTENT.denied
            : status === 'conflict'
              ? HOSPITAL_ISSUES_CONTENT.conflict
              : status === 'failure'
                ? HOSPITAL_ISSUES_CONTENT.loadFailed
                : status === 'plan_limit'
                  ? HOSPITAL_ISSUES_CONTENT.planLimit
                  : '');

  return (
    <p
      className="hj-banner"
      role={status === 'loading' || status === 'empty' ? 'status' : 'alert'}
      data-tone={tone}
    >
      {copy}
      {status === 'plan_limit' ? (
        <>
          {' '}
          <Link to={ROUTES.SUBSCRIPTION}>{HOSPITAL_ISSUES_CONTENT.openPlan}</Link>
        </>
      ) : null}
      {status === 'failure' && onRetry ? (
        <>
          {' '}
          <button type="button" onClick={onRetry}>
            {HOSPITAL_ISSUES_CONTENT.retry}
          </button>
        </>
      ) : null}
      {status !== 'loading' && status !== 'empty' && status !== 'plan_limit' ? (
        <>
          {' '}
          <button type="button" onClick={onDismiss}>
            {HOSPITAL_ISSUES_CONTENT.dismiss}
          </button>
        </>
      ) : null}
    </p>
  );
}
