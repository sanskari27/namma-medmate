import { Link } from 'react-router-dom';
import { ROUTES } from '@/libs/constants/routes.const';
import { HOSPITAL_WARDS_CONTENT } from '../../HospitalWardsScreen.content';
import type { PageStatus } from '../../HospitalWardsScreen.utils';

type HospitalWardsStatusBannerProps = {
  status: PageStatus;
  onDismiss: () => void;
  onRetry: () => void;
};

export function HospitalWardsStatusBanner({
  status,
  onDismiss,
  onRetry,
}: HospitalWardsStatusBannerProps) {
  if (status === 'loading') {
    return (
      <p role="status" className="hw-banner" data-tone="warn">
        Loading ward occupancy…
      </p>
    );
  }
  if (status === 'empty') {
    return (
      <p role="status" className="hw-banner" data-tone="warn">
        {HOSPITAL_WARDS_CONTENT.empty}
      </p>
    );
  }
  if (status === 'plan_limit') {
    return (
      <p role="alert" className="hw-banner" data-tone="warn">
        {HOSPITAL_WARDS_CONTENT.planLimit}{' '}
        <Link to={ROUTES.SUBSCRIPTION} className="underline">
          {HOSPITAL_WARDS_CONTENT.openPlan}
        </Link>
      </p>
    );
  }
  if (status === 'denied') {
    return (
      <p role="alert" className="hw-banner" data-tone="alert">
        <strong>{HOSPITAL_WARDS_CONTENT.denied}</strong>
      </p>
    );
  }
  if (status === 'no_branch') {
    return (
      <p role="alert" className="hw-banner" data-tone="warn">
        {HOSPITAL_WARDS_CONTENT.noBranch}
      </p>
    );
  }
  if (status === 'validation') {
    return (
      <p role="alert" className="hw-banner" data-tone="alert">
        {HOSPITAL_WARDS_CONTENT.validation}
      </p>
    );
  }
  if (status === 'duplicate_code') {
    return (
      <p role="alert" className="hw-banner" data-tone="alert">
        {HOSPITAL_WARDS_CONTENT.duplicateCode}
      </p>
    );
  }
  if (status === 'conflict') {
    return (
      <p role="alert" className="hw-banner" data-tone="alert">
        {HOSPITAL_WARDS_CONTENT.conflict}{' '}
        <button type="button" className="underline" onClick={onRetry}>
          {HOSPITAL_WARDS_CONTENT.retry}
        </button>
      </p>
    );
  }
  if (status === 'failure') {
    return (
      <p role="alert" className="hw-banner" data-tone="alert">
        {HOSPITAL_WARDS_CONTENT.loadFailed}{' '}
        <button type="button" className="underline" onClick={onRetry}>
          {HOSPITAL_WARDS_CONTENT.retry}
        </button>
      </p>
    );
  }
  if (status === 'success') {
    return (
      <p role="status" className="hw-banner" data-tone="ok">
        {HOSPITAL_WARDS_CONTENT.wardSaved}{' '}
        <button type="button" className="underline" onClick={onDismiss}>
          {HOSPITAL_WARDS_CONTENT.dismiss}
        </button>
      </p>
    );
  }
  return null;
}
