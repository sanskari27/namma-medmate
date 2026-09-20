import { Link } from 'react-router-dom';
import { ROUTES } from '@/libs/constants/routes.const';
import { HOSPITAL_BILLING_CONTENT } from '../../HospitalBillingScreen.content';
import type { PageStatus, SaveTarget } from '../../HospitalBillingScreen.utils';

export function HospitalBillingStatusBanner({
  status,
  saveTarget,
  onDismiss,
  onRetry,
}: {
  status: PageStatus;
  saveTarget: SaveTarget;
  onDismiss: () => void;
  onRetry: () => void;
}) {
  if (status === 'loading') {
    return (
      <div className="hb-loading" role="status">
        Loading hospital billing…
      </div>
    );
  }

  if (status === 'empty') {
    return (
      <div className="hb-banner" data-tone="warn" role="status">
        {HOSPITAL_BILLING_CONTENT.empty}
      </div>
    );
  }

  if (status === 'plan_limit') {
    return (
      <div className="hb-banner" data-tone="warn" role="alert">
        {HOSPITAL_BILLING_CONTENT.planLimit}
        <Link className="hb-link" to={ROUTES.SUBSCRIPTION}>
          {HOSPITAL_BILLING_CONTENT.openPlan}
        </Link>
      </div>
    );
  }

  if (status === 'denied') {
    return (
      <div className="hb-banner" data-tone="alert" role="alert">
        <strong>{HOSPITAL_BILLING_CONTENT.denied}</strong>
      </div>
    );
  }

  if (status === 'validation') {
    return (
      <div className="hb-banner" data-tone="alert" role="alert">
        {saveTarget === 'prices'
          ? HOSPITAL_BILLING_CONTENT.validationPrices
          : HOSPITAL_BILLING_CONTENT.validationAccount}
      </div>
    );
  }

  if (status === 'conflict') {
    return (
      <div className="hb-banner" data-tone="alert" role="alert">
        {HOSPITAL_BILLING_CONTENT.conflict}{' '}
        <button type="button" className="hb-link" onClick={onRetry}>
          {HOSPITAL_BILLING_CONTENT.retry}
        </button>
      </div>
    );
  }

  if (status === 'failure') {
    return (
      <div className="hb-banner" data-tone="alert" role="alert">
        {HOSPITAL_BILLING_CONTENT.loadFailed}{' '}
        <button type="button" className="hb-link" onClick={onRetry}>
          {HOSPITAL_BILLING_CONTENT.retry}
        </button>
      </div>
    );
  }

  if (status === 'pending_approval') {
    return (
      <div className="hb-banner" data-tone="warn" role="status">
        {HOSPITAL_BILLING_CONTENT.pricesPending}{' '}
        <button type="button" className="hb-link" onClick={onDismiss}>
          {HOSPITAL_BILLING_CONTENT.dismiss}
        </button>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="hb-banner" data-tone="ok" role="status">
        {saveTarget === 'prices'
          ? HOSPITAL_BILLING_CONTENT.pricesSaved
          : HOSPITAL_BILLING_CONTENT.accountSaved}{' '}
        <button type="button" className="hb-link" onClick={onDismiss}>
          {HOSPITAL_BILLING_CONTENT.dismiss}
        </button>
      </div>
    );
  }

  return null;
}
