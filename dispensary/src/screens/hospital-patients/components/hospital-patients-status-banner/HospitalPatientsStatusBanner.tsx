import { Link } from 'react-router-dom';
import { ROUTES } from '@/libs/constants/routes.const';
import { HOSPITAL_PATIENTS_CONTENT } from '../../HospitalPatientsScreen.content';
import { statusMessage, type PageStatus } from '../../HospitalPatientsScreen.utils';
import type { HospitalActivePatientView } from '@/services/hospital';

type Props = {
  status: PageStatus;
  view: HospitalActivePatientView;
  message: string | null;
  onDismiss: () => void;
  onRetry?: () => void;
};

export function HospitalPatientsStatusBanner({
  status,
  view,
  message,
  onDismiss,
  onRetry,
}: Props) {
  if (!status) {
    return null;
  }

  const tone =
    status === 'success'
      ? 'ok'
      : status === 'failure' || status === 'denied'
        ? 'alert'
        : 'warn';
  const copy = statusMessage(status, view, message);
  const role = status === 'loading' || status === 'empty' || status === 'success' ? 'status' : 'alert';

  return (
    <p className="hp-banner" role={role} data-tone={tone}>
      {copy}
      {status === 'plan_limit' ? (
        <>
          {' '}
          <Link to={ROUTES.SUBSCRIPTION}>{HOSPITAL_PATIENTS_CONTENT.openPlan}</Link>
        </>
      ) : null}
      {status === 'failure' && onRetry ? (
        <>
          {' '}
          <button type="button" onClick={onRetry}>
            {HOSPITAL_PATIENTS_CONTENT.retry}
          </button>
        </>
      ) : null}
      {status !== 'loading' && status !== 'empty' && status !== 'plan_limit' && status !== 'no_branch' ? (
        <>
          {' '}
          <button type="button" onClick={onDismiss}>
            {HOSPITAL_PATIENTS_CONTENT.dismiss}
          </button>
        </>
      ) : null}
    </p>
  );
}
