import { Link } from 'react-router-dom';
import { ROUTES } from '@/libs/constants/routes.const';
import { HOSPITAL_BILLING_CONTENT } from '../../HospitalBillingScreen.content';
import {
  billingAlertCopy,
  type BillingView,
  type PageStatus,
  type SaveTarget,
} from '../../HospitalBillingScreen.utils';

function successCopy(saveTarget: SaveTarget): string {
  if (saveTarget === 'prices') {
    return HOSPITAL_BILLING_CONTENT.pricesSaved;
  }
  if (saveTarget === 'return') {
    return HOSPITAL_BILLING_CONTENT.stockReturned;
  }
  if (saveTarget === 'payment') {
    return HOSPITAL_BILLING_CONTENT.paymentPosted;
  }
  if (saveTarget === 'reminder') {
    return HOSPITAL_BILLING_CONTENT.reminderSent;
  }
  if (saveTarget === 'statement') {
    return HOSPITAL_BILLING_CONTENT.exportReady;
  }
  return HOSPITAL_BILLING_CONTENT.accountSaved;
}

function loadingCopy(view: BillingView): string {
  if (view === 'stock') {
    return HOSPITAL_BILLING_CONTENT.loadingStock;
  }
  if (view === 'statement') {
    return HOSPITAL_BILLING_CONTENT.loadingStatement;
  }
  return HOSPITAL_BILLING_CONTENT.loading;
}

export function HospitalBillingStatusBanner({
  status,
  saveTarget,
  errorCode,
  view,
  onDismiss,
  onRetry,
}: {
  status: PageStatus;
  saveTarget: SaveTarget;
  errorCode: string | null;
  view: BillingView;
  onDismiss: () => void;
  onRetry: () => void;
}) {
  if (status === 'loading') {
    return (
      <div className="hb-loading" role="status">
        {loadingCopy(view)}
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
        {billingAlertCopy(status, saveTarget, errorCode)}
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
        {successCopy(saveTarget)}{' '}
        <button type="button" className="hb-link" onClick={onDismiss}>
          {HOSPITAL_BILLING_CONTENT.dismiss}
        </button>
      </div>
    );
  }

  return null;
}
