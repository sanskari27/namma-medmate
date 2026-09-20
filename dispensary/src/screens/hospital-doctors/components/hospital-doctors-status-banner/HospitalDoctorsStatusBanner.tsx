import { Link } from 'react-router-dom';
import { ROUTES } from '@/libs/constants/routes.const';
import { HOSPITAL_DOCTORS_CONTENT } from '../../HospitalDoctorsScreen.content';
import type { PageStatus } from '../../HospitalDoctorsScreen.utils';

type Props = {
  status: PageStatus;
  onDismiss: () => void;
  onRetry: () => void;
};

export function HospitalDoctorsStatusBanner({ status, onDismiss, onRetry }: Props) {
  if (status === 'loading') {
    return (
      <p className="hdoc-banner" role="status" data-tone="warn">
        Loading doctors…
      </p>
    );
  }
  if (status === 'empty') {
    return (
      <p className="hdoc-banner" role="status" data-tone="warn">
        {HOSPITAL_DOCTORS_CONTENT.empty}
      </p>
    );
  }
  if (status === 'plan_limit') {
    return (
      <p className="hdoc-banner" role="status" data-tone="warn">
        {HOSPITAL_DOCTORS_CONTENT.planLimit}{' '}
        <Link to={ROUTES.SUBSCRIPTION}>{HOSPITAL_DOCTORS_CONTENT.openPlan}</Link>
      </p>
    );
  }
  if (status === 'denied') {
    return (
      <p className="hdoc-banner" role="alert" data-tone="alert">
        <strong>{HOSPITAL_DOCTORS_CONTENT.denied}</strong>
      </p>
    );
  }
  if (status === 'validation') {
    return (
      <p className="hdoc-banner" role="alert" data-tone="alert">
        {HOSPITAL_DOCTORS_CONTENT.validation}
      </p>
    );
  }
  if (status === 'registration_taken') {
    return (
      <p className="hdoc-banner" role="alert" data-tone="alert">
        {HOSPITAL_DOCTORS_CONTENT.registrationTaken}
      </p>
    );
  }
  if (status === 'conflict') {
    return (
      <p className="hdoc-banner" role="alert" data-tone="alert">
        {HOSPITAL_DOCTORS_CONTENT.conflict}{' '}
        <button type="button" onClick={onRetry}>
          {HOSPITAL_DOCTORS_CONTENT.retry}
        </button>
      </p>
    );
  }
  if (status === 'failure') {
    return (
      <p className="hdoc-banner" role="alert" data-tone="alert">
        {HOSPITAL_DOCTORS_CONTENT.loadFailed}{' '}
        <button type="button" onClick={onRetry}>
          {HOSPITAL_DOCTORS_CONTENT.retry}
        </button>
      </p>
    );
  }
  if (status === 'success') {
    return (
      <p className="hdoc-banner" role="status" data-tone="ok">
        {HOSPITAL_DOCTORS_CONTENT.doctorSaved}{' '}
        <button type="button" onClick={onDismiss}>
          {HOSPITAL_DOCTORS_CONTENT.dismiss}
        </button>
      </p>
    );
  }
  return null;
}
