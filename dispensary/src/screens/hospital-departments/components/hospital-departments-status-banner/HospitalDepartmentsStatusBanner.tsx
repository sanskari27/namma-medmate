import { Link } from 'react-router-dom';
import { ROUTES } from '@/libs/constants/routes.const';
import { HOSPITAL_DEPARTMENTS_CONTENT } from '../../HospitalDepartmentsScreen.content';
import type { PageStatus } from '../../HospitalDepartmentsScreen.utils';

type Props = {
  status: PageStatus;
  onDismiss: () => void;
  onRetry: () => void;
};

export function HospitalDepartmentsStatusBanner({ status, onDismiss, onRetry }: Props) {
  if (status === 'loading') {
    return (
      <p className="hd-banner" role="status" data-tone="warn">
        Loading departments…
      </p>
    );
  }
  if (status === 'empty') {
    return (
      <p className="hd-banner" role="status" data-tone="warn">
        {HOSPITAL_DEPARTMENTS_CONTENT.empty}
      </p>
    );
  }
  if (status === 'plan_limit') {
    return (
      <p className="hd-banner" role="status" data-tone="warn">
        {HOSPITAL_DEPARTMENTS_CONTENT.planLimit}{' '}
        <Link to={ROUTES.SUBSCRIPTION}>{HOSPITAL_DEPARTMENTS_CONTENT.openPlan}</Link>
      </p>
    );
  }
  if (status === 'denied') {
    return (
      <p className="hd-banner" role="alert" data-tone="alert">
        <strong>{HOSPITAL_DEPARTMENTS_CONTENT.denied}</strong>
      </p>
    );
  }
  if (status === 'validation') {
    return (
      <p className="hd-banner" role="alert" data-tone="alert">
        {HOSPITAL_DEPARTMENTS_CONTENT.validation}
      </p>
    );
  }
  if (status === 'duplicate_name') {
    return (
      <p className="hd-banner" role="alert" data-tone="alert">
        {HOSPITAL_DEPARTMENTS_CONTENT.duplicateName}
      </p>
    );
  }
  if (status === 'conflict') {
    return (
      <p className="hd-banner" role="alert" data-tone="alert">
        {HOSPITAL_DEPARTMENTS_CONTENT.conflict}{' '}
        <button type="button" onClick={onRetry}>
          {HOSPITAL_DEPARTMENTS_CONTENT.retry}
        </button>
      </p>
    );
  }
  if (status === 'failure') {
    return (
      <p className="hd-banner" role="alert" data-tone="alert">
        {HOSPITAL_DEPARTMENTS_CONTENT.loadFailed}{' '}
        <button type="button" onClick={onRetry}>
          {HOSPITAL_DEPARTMENTS_CONTENT.retry}
        </button>
      </p>
    );
  }
  if (status === 'success') {
    return (
      <p className="hd-banner" role="status" data-tone="ok">
        {HOSPITAL_DEPARTMENTS_CONTENT.departmentSaved}{' '}
        <button type="button" onClick={onDismiss}>
          {HOSPITAL_DEPARTMENTS_CONTENT.dismiss}
        </button>
      </p>
    );
  }
  return null;
}
